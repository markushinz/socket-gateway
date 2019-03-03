const fs = require('fs');

const parsePolicies = function () {
    const policiesFilename = process.env.POLICIES_FILENAME || '/policies.json';
    return fs.existsSync(__dirname + policiesFilename) ? JSON.parse(fs.readFileSync(__dirname + policiesFilename)) : {};
}

module.exports = {
    appPort: process.env.APP_PORT || process.env.PORT || 3000,
    socketPort: process.env.SOCKET_PORT || 3001,

    appSslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/server.crt'),
        key: fs.readFileSync(__dirname + '/ssl/server.key'),
        ca: fs.readFileSync(__dirname + '/ssl/ca.crt'),
    },

    socketSslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/server.crt'),
        key: fs.readFileSync(__dirname + '/ssl/server.key'),
        ca: fs.readFileSync(__dirname + '/ssl/ca.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    policies: parsePolicies()
};
