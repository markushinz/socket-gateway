# socket-gateway

An API Gateway based on websockets to expose endpoints not reachable from the Internet - implemented in node.js.

The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

## TLDR?

Have a look at `./example/` to have a fully working local setup using Docker 🐳 and docker-compose.

```shell
$ cd example/
$ ./init.sh
$ docker-compose up --build # Keep running
```

```shell
$ curl "http://localhost/query?message=Hello%20World!"

{"message":"Hello World!"}
```

## Prerequisites

* **Outer Layer**: A machine/server that is reachable from the Internet (usually cloud hosted).
* **Inner Layer(s)**: A machine/server that is able to reach the desired endpoint(s) (usually a machine/server located in the same LAN) that is able to reach the Internet. The other way round is not required! If you deploy multiple inner layers, the requests will be forwarded to the different inner layers using a custom scheduling technique.

### Certificates

* Two certificates for mutual authentication of the two layers. Such certificates can be created with the following commands:

```
outerLayer=dns.outer.layer

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = socket-gateway-inner-layer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = socket-gateway-inner-layer" > innerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout innerLayer.key -out innerLayer.crt -config innerLayer.conf -extensions "v3_req"

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $outerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $outerLayer" > outerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout outerLayer.key -out outerLayer.crt -config outerLayer.conf -extensions "v3_req"
```

* A sever certificate for the outer layer. Let's Encrypt is your friend 😉. Alternatively, you can also use the outer layer certificate you just created or serve the outer layer via HTTP.


## Deployment

### Outer Layer

The outer layer exposes the gateway functionality on port 443 (environment variable `PORT` or `SG_APP_PORT`). It accepts connections from (the) inner layer(s) on port 3000 (environment variable `SG_SOCKET_PORT`). Certificate and configuration files must be placed in the `./config/` directory.

Put files `server.crt`, `server.key`, `innerLayer.crt`, `outerLayer.crt`, and `outerLayer.key` into `./config/`. The certificates are used for TLS connections from/to clients as well as from/to the inner layer.

If you deploy the gateway behind a reverse proxy such as Apache or Nginx, you can also serve the outer layer using HTTP. The default port will then be 80 and you do not have to provide `server.crt`, `server.key` or respective environment variables. The connection between the outer and inner layer always uses TLS.

Create a file `./config/targets.yaml` to define host mappings between DNS names of the gateway (outer layer) and request targets. Keep in mind that multiple A or CNAME DNS records can point to the same outer layer 🥳! Check the following example:

```yaml
targets:
  "socket.gateway": # DNS name of the outer layer
    protocol: "https" # optional, target protocol, defaults to "https"
    hostname: "my.private.api" # required, target hostname
    port: 443 # optional, target port, defaults to 443
    policy: # optional, defaults to {"*": ["*"]}
      "/helloworld": # allowed path(s), may be *
        - "GET"
        - "POST" # allowed method(s), may include *
```

Now, all requests that are allowed by `targets.yaml` having the request header "host" set to "socket.gateway" get proxied to "my.private.api".

You can also specify the file contents or alternative file locations using environment variables such as `SG_INNER_LAYER_KEY`,  `SG_SERVER_CERT`, `SG_OUTER_LAYER_CERT_PATH`, `SG_TARGETS_PATH`, ....

### Inner Layer

The inner layer requires an environment variable "SG_OUTER_LAYER=dns.outer.layer:port". Certificate files must be placed in the `./config/` directory.

Put files `innerLayer.crt`, `innerLayer.key`, and `outerLayer.crt` into `./config/`. The certificate is used for TLS connections from/to the outer layer.

*Optional*: Provide an environment variable `NODE_EXTRA_CA_CERTS` to extend the well known "root" CAs for your private APIs.

You can also specify the file contents or alternative file locations using environment variables such as `SG_INNER_LAYER_KEY`,  `SG_SERVER_CERT`, `SG_OUTER_LAYER_CERT_PATH`, ....

## Gateway

Be aware that header values will be sanitized before forwarding them. The following headers will be removed:

*host, accept, accept-charset, accept-encoding, accept-language, accept-ranges, cache-control, content-encoding, content-length, content-md5, content-range, connection, date, expect, max-forwards, pragma, proxy-authorization, referer, te, transfer-encoding, user-agent, via*

The gateway behaves like a reverse proxy rewriting response headers. 
