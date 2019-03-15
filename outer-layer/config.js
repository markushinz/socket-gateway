const fs = require('fs');

const parsePolicies = function () {
    const policiesFile = process.env.POLICIES_FILE || __dirname + '/policies.json';
    return fs.existsSync(policiesFile) ? JSON.parse(fs.readFileSync(policiesFile)) : {};
}

module.exports = {
    appPort: process.env.APP_PORT || process.env.PORT || 3000,
    socketPort: process.env.SOCKET_PORT || 3001,

    appSslOptions: {
        cert: fs.readFileSync(process.env.APP_SERVER_CERT || __dirname + '/ssl/server.crt'),
        key: fs.readFileSync(process.env.APP_SERVER_KEY || __dirname + '/ssl/server.key'),
        ca: fs.readFileSync(process.env.APP_CA_CERT || __dirname + '/ssl/ca.crt'),
    },

    socketSslOptions: {
        cert: fs.readFileSync(process.env.SOCKET_SERVER_CERT || __dirname + '/ssl/server.crt'),
        key: fs.readFileSync(process.env.SOCKET_SERVER_KEY || __dirname + '/ssl/server.key'),
        ca: fs.readFileSync(process.env.SOCKET_CA_CERT || __dirname + '/ssl/ca.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    policies: parsePolicies(),

    timeout: process.env.TIMEOUT || 5000 // ms
};
