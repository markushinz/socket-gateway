const fs = require('fs');

const parsePolicies = function () {
    const policiesFile = process.env.POLICIES_FILE || __dirname + '/policies.json';
    return fs.existsSync(policiesFile) ? JSON.parse(fs.readFileSync(policiesFile)) : {};
}

module.exports = {
    appPort: process.env.APP_PORT || process.env.PORT || 3000,
    socketPort: process.env.SOCKET_PORT || 3001,

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

    policies: parsePolicies(),

    timeout: process.env.TIMEOUT || 5000 // ms
};
