const config = require('./config');

const app = require('./app');
const socket = require('./socket');
const http = require('http');
const server = http.createServer(app);

app.set('port', config.port);

socket(server);
server.listen(config.port, 'localhost');
