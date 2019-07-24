const fs = require('fs');

module.exports = {
    appPort: process.env.PORT || 3000,
    socketPort: process.env.SOCKET_PORT || 3001,

    appHostname: process.env.HOSTNAME || '0.0.0.0',
    socketHostname: process.env.SOCKET_HOSTNAME ||'0.0.0.0',

    appTlsOptions: {
        cert: fs.readFileSync(process.env.SERVER_CERT || __dirname + '/config/server.crt'),
        key: fs.readFileSync(process.env.SERVER_KEY || __dirname + '/config/server.key')
    },

    socketTlsOptions: {
        cert: fs.readFileSync(process.env.OUTER_LAYER_CERT || __dirname + '/config/outerLayer.crt'),
        key: fs.readFileSync(process.env.OUTER_LAYER_KEY || __dirname + '/config/outerLayer.key'),
        ca: fs.readFileSync(process.env.INNER_LAYER_CERT || __dirname + '/config/innerLayer.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    policiesFile: process.env.POLICIES_FILE || __dirname + '/config/policies.json',

    timeout: process.env.TIMEOUT || 5000 // ms
};
