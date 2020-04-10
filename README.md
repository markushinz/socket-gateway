# socket-gateway

An API Gateway based on websockets to expose endpoints not reachable from the Internet - implemented in node.js.

The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

[TLDR? Get me to an example](#example)

## Prerequisites

* **Outer Layer**: A machine/server that is reachable from the Internet (usually cloud hosted).
* **Inner Layer(s)**: A machine/server that is able to reach the desired endpoint(s) (usually a machine/server located in the same LAN) that is able to reach the Internet. The other way round is not required!

The inner layer has to sign a nonce to attest its identity before connecting to the outer layer. You can use the snipped below to create the required files.

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

You have to specify the inner layer public key either via the environment variable `SG_INNER_LAYER_PUBLIC_KEY` or provide an absolute path to a file using the environment variable `SG_INNER_LAYER_PUBLIC_KEY_FILE`

Define host mappings between DNS names of the gateway (outer layer) and request targets and provide it via the environment variable `SG_TARGETS` or provide an absolute path to a file using the environment variable `SG_TARGETS_FILE` Keep in mind that multiple A or CNAME DNS records can point to the same outer layer 🥳! Check the following example:

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

Now, all requests that are allowed py the specified policy that have the request header "host" set to "socket.gateway" get proxied to "my.private.api".

### Inner Layer

The inner layer requires an environment variable `SG_OUTER_LAYER=protocol://host<:port>` pointing to the outer layer. 

You have to specify the inner layer private key either via the environment variable `SG_INNER_LAYER_PRIVATE_KEY` or provide an absolute path to a file using the environment variable `SG_INNER_LAYER_PRIVATE_KEY_FILE`

*Optional*: Provide an environment variable `NODE_EXTRA_CA_CERTS` to extend the well known "root" CAs for your private APIs. This is also required if the outer layer uses a self-signed certificate.

*Optional*: Set the environment variable `NODE_ENV=development` to allow connections to the outer layer using the insecure http and ws protocols. Do not use in production!

## Example

This is how you get a fully working local setup using Docker 🐳 and docker-compose.

Please have a look [`config/targets.yaml`](config/targets.yaml), first. It maps localhost to http://hello-world:3000 and json.localhost to https://jsonplaceholder.typicode.com:443. It allows all requests to http://hello-world:3000 and only GET requests to https://jsonplaceholder.typicode.com:443 with the path todos/1.

### Docker 🐳 and docker-compose

Run `./createCertificates.sh` to generate all required files and `docker-compose up --build` to start both layers as well as a simple web server. After that, the gateway listens on http://localhost (Port 80) and via an nginx reverse proxy on https://localhost (Port 443). Futhermore, the inner layer connects to the outer layer via an nginx reverse proxy on https://localhost:3000. 

```shell
$ curl http://localhost # Rather do this with your web browser.
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <title>Hello World!</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body>
    <h1>Hello World!</h1>

    <!--truncated-->
</body>

</html>

$ curl -k "https://localhost/query?message=Hello%20World!" # Using https

{"message":"Hello World!"}

$ curl -H "Host: json.localhost" http://localhost/todos/1 # Different host

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}

$ curl http://json.localhost/posts/1 # This is not allowed

GET http://jsonplaceholder.typicode.com:443/posts/1 is not allowed by policy.
```
