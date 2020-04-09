const http = require('http');

const config = require('./config');
const app = require('./app');
const socket = require('./socket');
const socketApp = require('./socketApp');

const appServer = http.createServer(app);
const socketServer = http.createServer(socketApp);
const gateway = socket.createGateway(socketServer);

app.set('port', config.appPort);
app.set('gateway', gateway);
socketApp.set('port', config.socketPort);

appServer.listen(config.appPort);
console.log(`Listening on port ${config.appPort}...`);

socketServer.listen(config.socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${config.socketPort}...`);
