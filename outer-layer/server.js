const config = require('./config');

const app = require('./app');
const http = require('http');
const appServer = http.createServer(app);

const socket = require('./socket');
const https = require('https');
const socketServer = https.createServer(config.socketSslOptions);
const gateway = socket.createGateway(socketServer);

app.set('port', config.appPort);
app.set('gateway', gateway);

appServer.listen(config.appPort);
socketServer.listen(config.socketPort);
