## Example

Please have a look at the configuration files, first. `targets.yaml` maps localhost to http://hello-world:3000 and json.localhost to https://jsonplaceholder.typicode.com:443. It allows all requests to http://hello-world:3000 and only GET requests to https://jsonplaceholder.typicode.com:443 with the path todos/1.

### Docker 🐳 and docker-compose

Run `./createCertificates.sh` to generate all required certificates and `docker-compose up --build` to start both layers as well as a simple web server. After that, the gateway listens on http://localhost (Port 80). 

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

$ curl "http://localhost/query?message=Hello%20World!"

{"message":"Hello World!"}

$ curl -H "Host: json.localhost" http://localhost/todos/1

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}

$ curl http://json.localhost/posts/1 # This is not allowed

GET http://jsonplaceholder.typicode.com:443/posts/1 is not allowed by policy.
```

### Kubernetes (using Minikube)

Run `./createCertificates.sh` to generate all required certificates. Next, create all required resources:

```shell
$ kubectl create secret generic secrets-outer-layer --from-file=./config-outer-layer/outerLayer.key
$ kubectl create secret generic secrets-inner-layer --from-file=./config-inner-layer/innerLayer.key

$ kubectl create configmap config-outer-layer --from-file=./config-outer-layer/innerLayer.crt \
  --from-file=./config-outer-layer/outerLayer.crt --from-file=./config-outer-layer/targets.yaml
$ kubectl create configmap config-inner-layer --from-file=./config-inner-layer/innerLayer.crt \
  --from-file=./config-inner-layer/outerLayer.crt

$ # minikube addons enable ingress
$ kubectl apply -f ./kubernetes
```

```shell
$ curl -H "Host: localhost" "http://$(minikube ip)/query?message=Hello%20World!"

{"message":"Hello World!"}

$ curl -H "Host: json.localhost" "http://$(minikube ip)/todos/1"

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}
```
