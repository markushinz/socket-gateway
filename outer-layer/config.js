const fs = require('fs');

module.exports = {
    appPort: process.env.APP_PORT || process.env.PORT || 3000,
    socketPort: process.env.SOCKET_PORT || 3001,

    appHostname: process.env.APP_HOSTNAME || '0.0.0.0',
    socketHostname: process.env.SERVER_HOSTNAME ||'0.0.0.0',

    appTlsOptions: {
        cert: fs.readFileSync(process.env.APP_SERVER_CERT || __dirname + '/tls/app_server.crt'),
        key: fs.readFileSync(process.env.APP_SERVER_KEY || __dirname + '/tls/app_server.key')
    },

    socketTlsOptions: {
        cert: fs.readFileSync(process.env.SOCKET_SERVER_CERT || __dirname + '/tls/socket_server.crt'),
        key: fs.readFileSync(process.env.SOCKET_SERVER_KEY || __dirname + '/tls/socket_server.key'),
        ca: fs.readFileSync(process.env.SOCKET_CA_CERT || __dirname + '/tls/socket_ca.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    policiesFile: process.env.POLICIES_FILE || __dirname + '/policies.json',

    timeout: process.env.TIMEOUT || 5000 // ms
};
