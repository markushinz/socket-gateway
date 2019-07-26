This requires docker and docker-compose.

Run `./start.sh` to generate all required certificates and to start both layers. After that, the gateway listens on https://localhost:3000.

`policies.json` allows all requests to https://jsonplaceholder.typicode.com:443.

```
$ curl -k https://localhost:3000/jsonplaceholder.typicode.com/todos/1

{"userId":1,"id":1,"title":"delectus aut autem","completed":false}
```
