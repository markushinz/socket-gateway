const fs = require('fs');

module.exports = {
    appPort: process.env.PORT || process.env.APP_PORT || 3000,
    appHTTPPort: process.env.APP_HTTP_PORT,
    socketPort: process.env.SOCKET_PORT || 3001,

    appTlsOptions: {
        cert: fs.readFileSync(__dirname + '/config/server.crt'),
        key: fs.readFileSync(__dirname + '/config/server.key')
    },

    socketTlsOptions: {
        cert: fs.readFileSync(__dirname + '/config/outerLayer.crt'),
        key: fs.readFileSync(__dirname + '/config/outerLayer.key'),
        ca: fs.readFileSync(__dirname + '/config/innerLayer.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    policiesFile: __dirname + '/config/policies.json',

    timeout: process.env.TIMEOUT || 5000 // ms
};
