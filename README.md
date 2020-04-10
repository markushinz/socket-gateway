# WIP: socket-gateway 2.0

An API Gateway based on websockets to expose endpoints not reachable from the Internet - implemented in node.js.

The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

## TLDR?

Run the following commands to get a fully working local setup using Docker 🐳 and docker-compose.

```shell
$ ./createCertificates.sh
$ docker-compose up --build # Keep running
```

```shell
$ curl 'http://localhost/query?message=Hello%20World!'

{"message":"Hello World!"}
```

## Prerequisites

* **Outer Layer**: A machine/server that is reachable from the Internet (usually cloud hosted).
* **Inner Layer(s)**: A machine/server that is able to reach the desired endpoint(s) (usually a machine/server located in the same LAN) that is able to reach the Internet. The other way round is not required!

The inner layer has to sign a nonce and therefore attest its identity before connecting to the outer layer. You can use the snipped below to create the required files.

```shell
openssl genrsa -out innerLayer.pem 4096
openssl rsa -in innerLayer.pem -pubout -out innerLayer.crt
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in innerLayer.pem -out innerLayer.key
rm -f innerLayer.pem
```

If you deploy multiple inner layers, the requests will be forwarded to the different inner layers using a custom scheduling technique.

## Deployment

### Outer Layer

The outer layer exposes the gateway functionality on port 80 (environment variable `PORT` or `SG_APP_PORT`). It accepts connections from (the) inner layer(s) on port 3000 (environment variable `SG_SOCKET_PORT`).

You have to specify the inner layer public key either via the environment variable `process.env.SG_INNER_LAYER_PUBLIC_KEY` or provide an absolute path to a file using the environment variable `process.env.SG_INNER_LAYER_PUBLIC_KEY_FILE`.

Define host mappings between DNS names of the gateway (outer layer) and request targets and provide it via the environment variable `process.env.SG_TARGETS` or provide an absolute path to a file using the environment variable `SG_TARGETS_FILE`. Keep in mind that multiple A or CNAME DNS records can point to the same outer layer 🥳! Check the following example:

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

Now, all requests that are allowed having the request header "host" set to "socket.gateway" get proxied to "my.private.api".

### Inner Layer

The inner layer requires an environment variable "SG_OUTER_LAYER=protocol://host<:port>" pointing to the outer layer. 

You have to specify the inner layer private key either via the environment variable `process.env.SG_INNER_LAYER_PRIVATE_KEY` or provide an absolute path to a file using the environment variable `process.env.SG_INNER_LAYER_PRIVATE_KEY_FILE`.

*Optional*: Provide an environment variable `NODE_EXTRA_CA_CERTS` to extend the well known "root" CAs for your private APIs. This is also required if the outer layer uses a self-signed certificate.

*Optional*: Set the environment variable `NODE_ENV=development` to allow connections to the outer layer using the insecure http and ws protocols. Do not use in production!
