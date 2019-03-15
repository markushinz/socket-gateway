# socket-gateway

A gateway implementation based on websockets to expose endpoints not reachable from the Internet.

The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

## Prerequisites

* **Outer Layer**: A machine/server that is reachable from the Internet (usually cloud hosted).
* **Inner Layer**: A machine/server that is able to reach the desired endpoint(s) (usually a machine/server located in the same LAN) that is able to reach the Internet. The other way round is not required.

## Deployment

### Outer Layer

Put files `server.crt`, `server.key`, and `ca.crt` into `./ssl/`. The certificate is used for SSL connections from/to clients as well as from/to the inner layer. Create a file `./policies.json` to define which request should be allowed. Check the following example:

```
{
    "my.private.api": {         // allowed host(s)
        "443": {                // allowed port(s), may be *
            "/exposedRoute": [  // allowed path(s), may be *
                "GET", "POST"   // allowed method(s), may be *
            ]
        }
    }
}
```

Check `config.js` and `policy.js` on how to change further (environment) variables and how `policies.json` is parsed.

Finally, deploy the outer layer with `sudo ./deploy.sh master npm`.

### Inner Layer

Put files `client.crt`, `client.key`, and `ca.crt` into `./ssl/`. The certificate is used for SSL connections from/to the outer layer and must be issued by the same certificate authority as the SSL certificate used for the outer layer.

*Optional*: Create a file `./certificateAuthorities.json` to set certificate authorities for hosts (if self signed) and put the certificates in `./ssl/`. Check the following example:

```
{
    "my.private.api": [       // hostname
        "myPrivateApiCa.crt"  // filename(s)
    ]
}
```

Check `config.js` on how to change further (environment) variables and how `certificateAuthorities.json` is parsed.

Finally, set the URL of the outer layer as an environment variable `OUTER_LAYER` and deploy the inner layer with `sudo ./deploy.sh master npm`.

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