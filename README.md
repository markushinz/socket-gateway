# socket-gateway

An API Gateway based on websockets to expose endpoints not reachable from the Internet - implemented in node.js.

The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

**TLDR? Have a look at `./example` to have a fully working local setup using Docker and docker-compose.**

 ![](screenshot.png)

```
$ curl -H "Authorization: Bearer d6FSlf9szR" https://socket.gateway/my.private.api/helloworld
```

## Prerequisites

* **Outer Layer**: A machine/server that is reachable from the Internet (usually cloud hosted).
* **Inner Layer(s)**: A machine/server that is able to reach the desired endpoint(s) (usually a machine/server located in the same LAN) that is able to reach the Internet. The other way round is not required! If you deploy multiple inner layers, the requests will be forwarded to the different inner layers using round robin scheduling.

### Certificates

* Two certificates for mutual authentication of the two layers. Such certificates can be created with the following commands:

```
outerLayer=dns.outer.layer

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = socket-gateway-inner-layer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = socket-gateway-inner-layer" > innerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout innerLayer.key -out innerLayer.crt -config innerLayer.conf -extensions "v3_req"

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $outerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $outerLayer" > outerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout outerLayer.key -out outerLayer.crt -config outerLayer.conf -extensions "v3_req"
```

* A sever certificate for the outer layer. Let's Encrypt is your friend 😉. Alternatively, you can also use the outer layer certificate you just created.


## Deployment

### Outer Layer

The outer layer exposes the gateway functionality on port 443 (environment variable "PORT" or "APP_PORT"). It accepts connections from (the) inner layer(s) on port 3000 (environment variable "SOCKET_PORT"). Certificate and configuration files must be placed in the `./config` directory.

Put files `server.crt`, `server.key`, `innerLayer.crt`, `outerLayer.crt`, and `outerLayer.key` into `./config/`. The certificates are used for TLS connections from/to clients as well as from/to the inner layer.

Create a file `./config/policies.json` to define which request should be allowed. Check the following example:

```
{
    "my.private.api": { // allowed host(s)
        "443": { // allowed port(s), may be *
            "/helloworld": [ // allowed path(s), may be *
                "GET",
                "POST" // allowed method(s), may include *
            ]
        }
    }
}
```

Check `evaluate.js` on how to change further (environment) variables and how `policies.json` is parsed.

*Optional*: Create a file `./config/hosts.json` to define host mappings between DNS names of the gateway and request targets. This allows you to use the gateway as a reverse proxy. Check the following example:

```
{
    "api.socket.gateway": "my.private.api"
}
```

Now, all requests that are allowed by `policies.json` having the request header "host" set to "api.socket.gateway" get proxied to "my.private.api".

### Inner Layer

The inner layer requires an environment variable "OUTER_LAYER"=dns.outer.layer:port. Certificate files must be placed in the `./config` directory.

Put files `innerLayer.crt`, `innerLayer.key`, and `outerLayer.crt` into `./config/`. The certificate is used for TLS connections from/to the outer layer.

*Optional*: Provide an environment variable `NODE_EXTRA_CA_CERTS` to extend the well known "root" CAs for your private APIs.

Finally, set the URL of the outer layer as an environment variable `OUTER_LAYER`.

## Gateway

Use one of the following ways to use the gateway.

Be aware that header values will be sanitized before forwarding them. The following headers will be removed:

*host, accept, accept-charset, accept-encoding, accept-language, accept-ranges, cache-control, content-encoding, content-length, content-md5, content-range, connection, date, expect, max-forwards, pragma, proxy-authorization, referer, te, transfer-encoding, user-agent, via*

**Only option A) behaves like a reverse proxy rewriting both response headers and body.** For options B) and C), Both absolute and relative paths from subsequent requests (i.e. loading stylesheets) will likely result in an error.

### A) Map DNS names

This is both the easiest and best way to use the gateway. Create a file `hosts.json` as described above to map dns names of the outer layer to the request targets.

Keep in mind that multiple A or CNAME DNS records can point to the same outer layer 🥳!

### B) Prepend host to path

If you want to perform "GET https://my.private.api/router?key=value" through the gateway, simply perform "GET https://socket.gateway/my.private.api/router?key=value".

The request path, method, headers, query and body will be forwarded, too. The schema is fixed to "https" and the port is fixed to "443".

### C) Perform "POST /"

Perform a `POST /`request with the following JSON body:

```
{
	"schmea" : "https",        // optional, either http or https, defaults to https
	"host": "my.private.api",  // required
	"port": "443",             // optional, defaults to 80 if http else 443
	"path": "/",               // optional, defaults to /
	"method": "GET",           // either HEAD, GET, POST, PUT, DELETE, defaults to GET
	"headers": {},             // optional
	"query": {},               // optional
	"body": {}                 // optional
}
```

You may also use the provided form at `GET /` to perform the request.
