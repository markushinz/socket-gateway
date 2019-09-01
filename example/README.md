This requires Docker and docker-compose.

Run `./start.sh` to generate all required certificates and to start both layers as well as a simple web layer. After that, the gateway listens on https://localhost. 

`targets.yaml` maps localhost to http://hello-world:3000 and json.localhost to https://jsonplaceholder.typicode.com:443. It allows all requests to http://hello-world:3000 and only GET requests to https://jsonplaceholder.typicode.com:443 with the path todos/1.

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

$ curl -k https://localhost/query?message=Hello%20World!

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
