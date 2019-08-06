const fs = require('fs');

module.exports = {
    appPort: process.env.PORT || process.env.APP_PORT || 443,
    socketPort: process.env.SOCKET_PORT || 3000,

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

    timeout: process.env.TIMEOUT || 10000, // ms

    get policies() {
        try {
            return JSON.parse(fs.readFileSync(__dirname + '/config/policies.json'));
        } catch (error) {
            console.error(error);
            return {};
        }
    },

    get hosts() {
        if (!fs.existsSync(__dirname + '/config/hosts.json')) {
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(__dirname + '/config/hosts.json'));
        } catch (error) {
            console.error(error);
            return {};
        }
    }
};
