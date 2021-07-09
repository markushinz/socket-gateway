## Example

### Docker 🐳 and docker-compose

This is how you get a fully working local setup. Please have a look [`targets.yaml`](targets.yaml), first. It maps localhost and example.gateway.localhost to http://example-server-service:3000 and json.gateway.localhost to https://jsonplaceholder.typicode.com:443. It allows all requests to http://example-server-service:3000 and only GET requests to https://jsonplaceholder.typicode.com:443 with the path todos/1.

Run [`createCertificates.sh`](createCertificates.sh) to generate all required files and `docker-compose up --build` to start both layers as well as a simple web server. After that, the gateway listens on http://localhost (Port 80) and via an nginx reverse proxy on https://localhost (Port 443). Futhermore, the inner layer connects to the outer layer via an nginx reverse proxy on https://localhost:3000. 

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
