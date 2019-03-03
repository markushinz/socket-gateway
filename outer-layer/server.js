const config = require('./config');

const app = require('./app');
const socket = require('./socket');
const http = require('http');
const server = http.createServer(app);

const proxy = socket(server);

app.set('port', config.port);
app.set('proxy', proxy);

server.listen(config.port, 'localhost');
