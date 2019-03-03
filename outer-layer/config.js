const fs = require('fs');

module.exports = {
    appPort: process.env.APP_PORT || process.env.PORT || 3000,
    socketPort: process.env.SOCKET_PORT || 3001,

    socketSslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/gateway_server.crt'),
        key: fs.readFileSync(__dirname + '/ssl/gateway_server.key'),
        ca: fs.readFileSync(__dirname + '/ssl/gateway_ca.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    policies: {
        'https://jsonplaceholder.typicode.com/todos/1': ['GET'],
    }
};
