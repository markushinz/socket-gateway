# socket-gateway

[![CI](https://github.com/markushinz/socket-gateway/actions/workflows/ci.yaml/badge.svg)](https://github.com/markushinz/socket-gateway/actions/workflows/ci.yaml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=markushinz_socket-gateway&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=markushinz_socket-gateway)

An API Gateway based on websockets to expose HTTP(S) endpoints not reachable from the Internet - implemented in node.js.
The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

![](scenario/scenario.svg)

In the preceding scenario `Client` can not directly connect to `Server` as no connection to `Router 2` can be established from the `Internet`.
When using the socket-gateway the inner layer (a component that is able to establish a connection to `Server`) creates a persistent websocket connection (`Inner layer -> Router 2 -> Internet -> Router 3 -> Outer layer`) to the outer layer (a compoent that can be connected to from the `Internet`).
The outer layer uses that connection to forward requests to the target network (if allowed).
`Client` can connect to `Server` using the socket-gateway via `Client -> Router 1 -> Internet -> Router 3 -> Outer layer -> Router 3 -> Internet -> Router 2 -> Inner layer -> Router 2 -> Server`.
 
### Docker 🐳
```bash
# https://hub.docker.com/r/markushinz/socket-gateway/tags
docker pull markushinz/socket-gateway:latest
```
### npm

> ⚠️ This is a very simple setup. Check out the [help section](#help) for all configuration options and [this example](example) for a secure production setup.

```bash
# npm https://github.com/markushinz/socket-gateway/releases
npm install -g https://github.com/markushinz/socket-gateway/releases/latest/download/socket-gateway.tgz

socket-gateway certificates # generate certificate (innerLayer.crt and innerLayer.key)
echo '{"targets":{"localhost":{"hostname":"jsonplaceholder.typicode.com"}}}' > targets.yaml

socket-gateway outer-layer \
  --inner-layer-certificate innerLayer.crt \
  --targets targets.yaml \
  --app-port 3000 \
  --socket-port 3001 # keep running

socket-gateway inner-layer \
  --inner-layer-private-key innerLayer.key \
  --outer-layer ws://localhost:3001 # keep running

curl http://localhost:3000 # just like curl https://jsonplaceholder.typicode.com
```

## Prerequisites

* **Outer Layer**: A machine/server that is reachable from the Internet (usually cloud hosted).
* **Inner Layer(s)**: A machine/server that is able to reach the desired endpoint(s) (usually a machine/server located in the same LAN) that is able to reach the Internet. The other way round is not required! If you deploy multiple inner layers, the requests will be forwarded to the different inner layers using a custom scheduling technique.

## Deployment

### Outer Layer

Define host mappings between DNS names of the gateway (outer layer) and request targets. Keep in mind that multiple A or CNAME DNS records can point to the same outer layer 🥳! Check the following example:

```yaml
targets:
  "socket.gateway": # DNS name of the outer layer
    protocol: "https" # optional, target protocol, defaults to "https"
    hostname: "my.private.api" # required, target hostname
    port: 443 # optional, target port, defaults to 443
    policy: # optional, defaults to *
      # /helloworld gets compiled to ^/helloworld$
      # specify paths with a leading ^ if you want to use more advanced regexes
      "/helloworld": # allowed path(s), may be *
        - "GET"
        - "POST" # allowed method(s), may be or include *
    identifier: "inner-layer" # optional, identifier or list of identifiers to route to. If not specified, requests will get routed to any connected inner layer
```

Now, all requests that are allowed py the specified policy that have the request header "host" set to "socket.gateway" get proxied to "my.private.api".

### Inner Layer

*Optional*: Provide an environment variable `NODE_EXTRA_CA_CERTS` to extend the well known "root" CAs for your private APIs.

## Help

### certificates

```
$ socket-gateway certificates --help

Generate certificates

Options:
  --help                       Show help                               [boolean]
  --version                    Show version number                     [boolean]
  --private-key                The private key file to write
                                                     [default: "innerLayer.key"]
  --certificate, --public-key  The public key file to write
                                                     [default: "innerLayer.crt"]
  --common-name                The common name of the certificate
                                                        [default: "inner-layer"]
  --validity                   The certificate validity in years  [default: 100]
```

### outer-layer

```
$ socket-gateway outer-layer

Start the outer-layer --help

Options:
  --help            Show help                                          [boolean]
  --version         Show version number                                [boolean]
  --admin-password  The admin password                                  [string]
  --trust-proxy                    [default: "loopback, linklocal, uniquelocal"]
  --timeout                                                    [default: 180000]
  --validity                                                     [default: 1000]
  --remove-csps     Removes content-security-policy response headers
                                                      [boolean] [default: false]
  --app-port        The port the gateway consumers connect to    [default: 3000]
  --socket-port     The port the inner layer(s) connect to       [default: 3001]
  --public-key      The corresponsing public key or certificate file of the
                    inner layer(s)                                    [required]
  --targets         The targets file   
```

### inner-layer

```
$ socket-gateway inner-layer --help

Start the inner-layer

Options:
  --help                                    Show help                  [boolean]
  --version                                 Show version number        [boolean]
  --inner-layer-identifier, --identifier    The identifier to distinguish
                                            multiple inner layers
                                                 [default: "<hostname>"]
  --outer-layer-ca                          The outer layer cert or CA file to
                                            check against. If not provided all
                                            well known CAs are accepted.[string]
  --inner-layer-private-key, --private-key  The private key file used to
                                            authenticate against the outer
                                            layer. The private key is used
                                            during a challenge-response
                                            authentication mechanism. [required]
  --inner-layer-certificate                 The certificate file signed by the
                                            private key to use when establishing
                                            the TLS connection to the outer
                                            layer. Provide the certificate if
                                            you want to use client certificate
                                            authenticaion on top of the
                                            challenge-response authentication
                                            mechanism.                  [string]
  --outer-layer                             The outer layer URI to connect to
                                                                      [required]
  --insecure                                Allow connections to the outer layer
                                            via http/ws
                                                      [boolean] [default: false]
```
