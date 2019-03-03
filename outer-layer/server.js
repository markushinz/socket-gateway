const config = require('./config');

const app = require('./app');
const http = require('http');
const appServer = http.createServer(app);

const gateway = require('./gateway');
const https = require('https');
const gatewayServer = https.createServer(config.gatewaySslOptions);

app.set('port', config.appPort);
app.set('gateway', gateway(gatewayServer));

appServer.listen(config.appPort);
gatewayServer.listen(config.gatewayPort);
