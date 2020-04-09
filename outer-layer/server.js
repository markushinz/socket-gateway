const config = require('./config');

const http = require('http');

const app = require('./app');
const appServer = http.createServer(app);

const socket = require('./socket');
const socketServer = http.createServer(socket.app);
const gateway = socket.createGateway(socketServer);

app.set('port', config.appPort);
app.set('gateway', gateway);

socket.app.set('port', config.socketPort);

appServer.listen(config.appPort);
console.log(`Listening on port ${config.appPort}...`);

socketServer.listen(config.socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${config.socketPort}...`);
