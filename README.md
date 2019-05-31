# socket-gateway

A gateway implementation based on websockets to expose endpoints not reachable from the Internet.

The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

 ![](screenshot.png)

## Prerequisites

* **Outer Layer**: A machine/server that is reachable from the Internet (usually cloud hosted).
* **Inner Layer**: A machine/server that is able to reach the desired endpoint(s) (usually a machine/server located in the same LAN) that is able to reach the Internet. The other way round is not required.

### Certificates

* Two certificates for mutual authentication of the two layers. Such certificates con be created with the following commands:

```
innerLayer=dns.inner.layer
outerLayer=dns.outer.layer

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $innerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $innerLayer" > innerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout innerLayer.key -out innerLayer.crt -config innerLayer.conf -extensions "v3_req"

echo -e "[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n[req_distinguished_name]\nCN = $outerLayer\n[v3_req]\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = $outerLayer" > outerLayer.conf
openssl req -x509 -nodes -days 365 -newkey rsa:4096 -keyout outerLayer.key -out outerLayer.crt -config outerLayer.conf -extensions "v3_req"
```

You may also use `./crypto.sh`to autogenerate all required files.

* A sever certificate for the outer layer. Let's Encrypt is your friend 😉


## Deployment

### Outer Layer

Put files `server.crt`, `server.key`, `innerLayer.crt`, `outerLayer.crt`, and `outerLayer.key` into `./tls/`. The certificates are used for TLS connections from/to clients as well as from/to the inner layer. Create a file `./policies.json` to define which request should be allowed. Check the following example:

```
{
    "my.private.api": {         // allowed host(s)
        "443": {                // allowed port(s), may be *
            "/": [              // allowed path(s), may be *
                "GET", "POST"   // allowed method(s), may include *
            ]
        }
    }
}
```

Check `config.js` and `policy.js` on how to change further (environment) variables and how `policies.json` is parsed.

Finally, start the outer layer with `sudo ./deploy.sh master npm`.

### Inner Layer

Put files `innerLayer.crt`, `innerLayer.key`, and `outerLayer.crt` into `./tls/`. The certificate is used for TLS connections from/to the outer layer.

*Optional*: Provide an environment variable `NODE_EXTRA_CA_CERTS` to extend the well known "root" CAs for your private APIs.

Check `config.js` on how to change further (environment) variables.

Finally, set the URL of the outer layer as an environment variable `OUTER_LAYER` and start the inner layer with `sudo ./deploy.sh master npm`.

## Gateway

To use the gateway, either use the form provided at `GET /` or directly perform a `POST /`request with the following JSON body:

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