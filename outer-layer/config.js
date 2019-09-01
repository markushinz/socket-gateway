const fs = require('fs');

const yaml = require('js-yaml');

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

    timeout: process.env.TIMEOUT, // ms

    get targets() {
        try {
            return yaml.safeLoad(fs.readFileSync(__dirname + '/config/targets.yaml', 'utf8')).targets;
        } catch (error) {
            console.error(error);
            return {};
        }
    }
};
