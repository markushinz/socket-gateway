const config = require('./config');

const http = require('http');
const https = require('https');

const app = require('./app');
const appServer = config.appTlsOptions ? https.createServer(config.appTlsOptions, app) : http.createServer(app);

const socket = require('./socket');
const socketServer = https.createServer(config.socketTlsOptions);
const gateway = socket.createGateway(socketServer);

app.set('port', config.appPort);
app.set('gateway', gateway);

appServer.listen(config.appPort);
console.log(`Listening on port ${config.appPort}...`);
socketServer.listen(config.socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${config.socketPort}...`);
