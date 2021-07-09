# socket-gateway

An API Gateway based on websockets to expose endpoints not reachable from the Internet - implemented in node.js.

The gateway allows you to reach endpoints not reachable due to NAT, ISP restrictions, or any other reasons.

```bash
# 🐳 https://hub.docker.com/r/markushinz/socket-gateway/tags
docker pull markushinz/socket-gateway:latest

# npm https://github.com/markushinz/socket-gateway/releases
npm install -g https://github.com/markushinz/socket-gateway/releases/latest/download/socket-gateway.tgz

socket-gateway certificates # generate key pair (innerLayer.crt and innerLayer.key)
echo '{"targets":{"localhost":{"hostname":"jsonplaceholder.typicode.com"}}}' > targets.yaml

socket-gateway outer-layer \
  --public-key innerLayer.crt \
  --targets targets.yaml \
  --app-port 3000 \
  --socket-port 3001 # keep running

socket-gateway inner-layer \
  --private-key innerLayer.key \
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
    policy: # optional, defaults to {"*": ["*"]}
      "/helloworld": # allowed path(s), may be *
        - "GET"
        - "POST" # allowed method(s), may include *
```

Now, all requests that are allowed py the specified policy that have the request header "host" set to "socket.gateway" get proxied to "my.private.api".

### Inner Layer

*Optional*: Provide an environment variable `NODE_EXTRA_CA_CERTS` to extend the well known "root" CAs for your private APIs. This is also required if the outer layer uses a self-signed certificate.

## Example

### Docker 🐳 and docker-compose

This is how you get a fully working local setup. Please have a look [`config/targets.yaml`](config/targets.yaml), first. It maps localhost and example.gateway.localhost to http://example-server-service:3000 and json.gateway.localhost to https://jsonplaceholder.typicode.com:443. It allows all requests to http://example-server-service:3000 and only GET requests to https://jsonplaceholder.typicode.com:443 with the path todos/1.

Run [`./createCertificates.sh`](createCertificates.sh) to generate all required files and `docker-compose up --build` to start both layers as well as a simple web server. After that, the gateway listens on http://localhost (Port 80) and via an nginx reverse proxy on https://localhost (Port 443). Futhermore, the inner layer connects to the outer layer via an nginx reverse proxy on https://localhost:3000. 

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

$ curl -H "Host: json.gateway.localhost" http://localhost/todos/1 # Different host

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}

$ curl http://json.gateway.localhost/posts/1 # This is not allowed

GET http://jsonplaceholder.typicode.com:443/posts/1 is not allowed by policy.
```

### Kubernetes

This is how to get the outer layer running in a production setup on Kubernetes.

```shell
mkdir k8s

openssl genrsa -out k8s/innerLayer.pem 4096
openssl rsa -in k8s/innerLayer.pem -pubout -out k8s/innerLayer.crt
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in k8s/innerLayer.pem -out k8s/innerLayer.key
rm -f k8s/innerLayer.pem

cat << EOF > k8s/targets.yaml
targets:
  "json.gateway.example.com":
    hostname: "jsonplaceholder.typicode.com"
EOF

kubectl create ns socket-gateway
kubectl create cm outer-layer-config -n socket-gateway \
  --from-file=k8s/targets.yaml \
  --from-file=k8s/innerLayer.crt
kubectl create secret generic outer-layer-secret -n socket-gateway \
  --from-literal=adminPassword="$(openssl rand -base64 12)"
kubectl apply -f k8s.yaml
```

To expose the outer layer to the Internet, create an Ingress such as follows:

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: outer-layer-ingress
  namespace: socket-gateway
  annotations:
    cert-manager.io/cluster-issuer: cluster-issuer
spec:
  rules:
    - host: gateway.example.com
      http:
        paths:
          - backend:
              serviceName: outer-layer-service
              servicePort: 3001
    - host: "*.gateway.example.com"
      http:
        paths:
          - backend:
              serviceName: outer-layer-service
              servicePort: 3000
  tls:
    - hosts:
        - "*.gateway.example.com"
        - gateway.example.com
      secretName: outer-layer-ingress-tls-secret
```

Finally, you can run an inner layer from within the desired target network:

```bash
npx https://github.com/markushinz/socket-gateway/releases/latest/download/socket-gateway.tgz inner \
  --private-key "$(pwd)/k8s/innerLayer.key" \
  --outer-layer "https://gateway.example.com"
```
