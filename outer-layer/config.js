const fs = require('fs');

const parsePolicies = function () {
    return fs.existsSync(__dirname + '/policies.json') ? JSON.parse(fs.readFileSync(__dirname + '/policies.json')) : {};
}

module.exports = {
    appPort: process.env.APP_PORT || process.env.PORT || 3000,
    socketPort: process.env.SOCKET_PORT || 3001,

    socketSslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/server.crt'),
        key: fs.readFileSync(__dirname + '/ssl/server.key'),
        ca: fs.readFileSync(__dirname + '/ssl/ca.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    policies: parsePolicies()
};
