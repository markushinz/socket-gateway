This requires Docker and docker-compose.

Run `./start.sh` to generate all required certificates and to start both layers. After that, the gateway listens on https://localhost.

`config.json` allows all requests to https://jsonplaceholder.typicode.com:443.

```
$ curl -k https://localhost/jsonplaceholder.typicode.com/todos/1

{"userId":1,"id":1,"title":"delectus aut autem","completed":false}

$ curl -k -H "Content-Type: application/json" -X POST -d '{"host": "jsonplaceholder.typicode.com", "path": "/todos/1"}' https://localhost/

{
  "userId": 1,
  "id": 1,
  "title": "delectus aut autem",
  "completed": false
}
```

*Optional*: To use the reverse proxy functionality, edit your `/etc/hosts` file and add the following line:

```
127.0.0.1 json.localhost
```

Now, you can also do the following:

```
$ curl -k https://json.localhost/todos/1

{"userId":1,"id":1,"title":"delectus aut autem","completed":false}
```

