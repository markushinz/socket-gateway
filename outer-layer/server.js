const config = require('./config');

const https = require('https');

const app = require('./app');
const appServer = https.createServer(config.appSslOptions, app);

const socket = require('./socket');
const socketServer = https.createServer(config.socketSslOptions);
const gateway = socket.createGateway(socketServer);

app.set('port', config.appPort);
app.set('gateway', gateway);

appServer.listen(config.appPort);
socketServer.listen(config.socketPort);
