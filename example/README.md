## Example

Please have a look at the configuration files, first. `targets.yaml` maps localhost to http://hello-world:3000 and json.localhost to https://jsonplaceholder.typicode.com:443. It allows all requests to http://hello-world:3000 and only GET requests to https://jsonplaceholder.typicode.com:443 with the path todos/1.

### Docker 🐳 and docker-compose

Run `./init.sh` to generate all required certificates and `docker-compose up --build` to start both layers as well as a simple web server. After that, the gateway listens on https://localhost. 

```shell
$ curl -k https://localhost # Rather do this with your web browser. Ignore certificate warnings.

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <title>Hello World!</title>
</head>

<body>
    <h1>Hello World!</h1>

    <!--truncated-->
</body>

</html>

$ curl -k "https://localhost/query?message=Hello%20World!"

{"message":"Hello World!"}
```

*Optional*: Edit your `/etc/hosts` file and add the following line:

```
127.0.0.1 json.localhost
```

Now, you can also do the following:

```shell
$ curl -k https://json.localhost/todos/1

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}

$ curl -k https://json.localhost/posts/1 # This is not allowed

{"message":"Forbidden","error":"GET https://jsonplaceholder.typicode.com:443/posts/1 is not allowed by policy."}
```

### Kubernetes (using Minikube)

Run `./init.sh` to generate all required certificates. Next, create secrets for the two layers:

```shell
$ kubectl create secret generic config-outer-layer --from-file=./config-outer-layer
$ kubectl create secret generic config-inner-layer --from-file=./config-inner-layer
```

Finally, run `kubectl apply -f ./kubernetes` to create services and deployments for both layers as well as for a simple web server.

```shell
$ minikube tunnel # expose the LoadBalancer service, keep running
$ serviceIP=$(kubectl get service outer-layer-load-balancer-service -o jsonpath="{.status.loadBalancer.ingress[0].ip}")

$ curl -k -H "Host: localhost" "https://$serviceIP/query?message=Hello%20World!"

{"message":"Hello World!"}

$ curl -k -H "Host: json.localhost" https://$serviceIP/todos/1

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}
```
