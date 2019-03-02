const config = require('./config');

const app = require('./app');
const http = require('http');
const server = http.createServer(app);

app.set('port', config.port);
server.listen(config.port, 'localhost');
