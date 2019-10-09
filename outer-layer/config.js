const fs = require('fs');

const yaml = require('js-yaml');

const cache = {
    targets: {},
    timestamp: null
}

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

    timeout: process.env.TIMEOUT || 60000, // ms

    get targets() {
        try {
            const now = Date.now();
            if (now - cache.timestamp > 60000) {
                cache.targets = yaml.safeLoad(fs.readFileSync(__dirname + '/config/targets.yaml', 'utf8')).targets;
                cache.timestamp = now;
            }
            return cache.targets;
        } catch (error) {
            console.error(error);
            return {};
        }
    },

    get adminCredentials() {
        if (process.env.NODE_ENVIRONMENT !== 'production' || process.env.ADMIN_PASSWORD) {
            return Buffer.from(`${process.env.ADMIN_USERNAME || 'admin'}:${process.env.ADMIN_PASSWORD || 'admin'}`).toString('base64');
        } else {
            return null;
        }
    }
};
