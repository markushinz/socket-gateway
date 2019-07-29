const config = require('./config');

const https = require('https');

const app = require('./app');
const appServer = https.createServer(config.appTlsOptions, app);

const socket = require('./socket');
const socketServer = https.createServer(config.socketTlsOptions);
const gateway = socket.createGateway(socketServer);

app.set('port', config.appPort);
app.set('gateway', gateway);

appServer.listen(config.appPort);
console.log(`Listening on port ${config.appPort}...`);
socketServer.listen(config.socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${config.socketPort}...`);

if (config.appPort == 443) {
    try {
        const http = require('http');

        const express = require('express');
        const httpAPP = express();

        httpAPP.get('*', function (req, res) {
            res.redirect('https://' + req.headers.host + req.url);
        });

        const appHTTPServer = http.createServer(httpAPP);
        appHTTPServer.listen(80);
        console.log(`Listening on port 80 for redirection...`);
    }
    catch (error) {
        // console.log(`Could not listen on port 80 for redirection.`);
    }
}
