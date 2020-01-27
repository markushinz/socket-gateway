const fs = require('fs');

const yaml = require('js-yaml');

const cache = {
    targets: {},
    timestamp: null
}

module.exports = {
    appPort: process.env.PORT ||
        process.env.SG_APP_PORT ||
        process.env.SG_HTTP === 'true' ? 80 : 443,
    socketPort: process.env.SG_SOCKET_PORT || 3000,

    appTlsOptions: process.env.SG_HTTP === 'true' ? null : {
        cert: process.env.SG_SERVER_CERT ||
            fs.readFileSync(process.env.SG_SERVER_CERT_FILE || __dirname + '/config/server.crt'),
        key: process.env.SG_SERVER_KEY ||
            fs.readFileSync(process.env.SG_SERVER_KEY_FILE || __dirname + '/config/server.key'),
    },

    socketTlsOptions: {
        cert: process.env.SG_OUTER_LAYER_CERT ||
            fs.readFileSync(process.env.SG_OUTER_LAYER_CERT_FILE || __dirname + '/config/outerLayer.crt'),
        key: process.env.SG_OUTER_LAYER_KEY ||
            fs.readFileSync(process.env.SG_OUTER_LAYER_KEY_FILE || __dirname + '/config/outerLayer.key'),
        ca: process.env.SG_INNER_LAYER_CERT ||
            fs.readFileSync(process.env.SG_INNER_LAYER_CERT_FILE || __dirname + '/config/innerLayer.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    timeout: process.env.SG_TIMEOUT || 60000, // ms

    get targets() {
        try {
            const now = Date.now();
            if (now - cache.timestamp > 60000) {
                cache.targets = yaml.safeLoad(process.env.SG_TARGETS ||
                    fs.readFileSync(process.env.SG_TARGETS_FILE || __dirname + '/config/targets.yaml', 'utf8')).targets;
                cache.timestamp = now;
            }
            return cache.targets;
        } catch (error) {
            console.error(error);
            return {};
        }
    },

    get adminCredentials() {
        if (process.env.NODE_ENVIRONMENT !== 'production' || process.env.SG_ADMIN_PASSWORD) {
            return Buffer.from(`${process.env.SG_ADMIN_USERNAME || 'admin'}:${process.env.SG_ADMIN_PASSWORD || 'admin'}`).toString('base64');
        } else {
            return null;
        }
    }
};
