const config = require('./config');

const https = require('https');

const app = require('./app');
const appServer = https.createServer(config.appTlsOptions, app);

const socket = require('./socket');
console.log(config.socketTlsOptions);
const socketServer = https.createServer(config.socketTlsOptions);
const gateway = socket.createGateway(socketServer);

app.set('port', config.appPort);
app.set('gateway', gateway);

appServer.listen(config.appPort);
console.log(`Listening on port ${config.appPort}...`);
socketServer.listen(config.socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${config.socketPort}...`);
