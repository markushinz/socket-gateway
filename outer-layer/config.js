const fs = require('fs');
const process = require('process');

const yaml = require('js-yaml');

const developmentMode = process.env.NODE_ENV === 'development';

const cache = {
    targets: {},
    timestamp: null
}

module.exports = {
    appPort: process.env.PORT || process.env.SG_APP_PORT || 80,
    socketPort: process.env.SG_SOCKET_PORT || 3000,

    trustProxy: process.env.SG_TRUST_PROXY || 'loopback, linklocal, uniquelocal',

    get timeout() { return process.env.SG_TIMEOUT || 60000},  // ms

    get challengeValidity() { return process.env.SG_CHALLENGE_VALIDITY || 50000 }, // ms

    get innerLayerPublicKey() {
        if (!!process.env.SG_INNER_LAYER_PUBLIC_KEY) {
            return process.env.SG_INNER_LAYER_PUBLIC_KEY
        }
        if (!!process.env.SG_INNER_LAYER_PUBLIC_KEY_FILE) {
            return fs.readFileSync(process.env.SG_INNER_LAYER_PUBLIC_KEY_FILE);
        }
        console.error('You have to specify the inner layer public key either via the environment variable ' +
            'process.env.SG_INNER_LAYER_PUBLIC_KEY or provide an absolute path to a file using the environment variable ' +
            'process.env.SG_INNER_LAYER_PUBLIC_KEY_FILE');
        process.exit(1);
    },

    get targets() {
        try {
            const now = Date.now();
            if (now - cache.timestamp > 60000) {
                cache.targets = yaml.safeLoad(process.env.SG_TARGETS ||
                    fs.readFileSync(process.env.SG_TARGETS_FILE, 'utf8')).targets;
                cache.timestamp = now;
            }
            return cache.targets;
        } catch (error) {
            console.error(error);
            return {};
        }
    },

    get adminCredentials() {
        const adminPassword = process.env.SG_ADMIN_PASSWORD;
        if (developmentMode || adminPassword) {
            return Buffer.from(`${process.env.SG_ADMIN_USERNAME || 'admin'}:${adminPassword || 'admin'}`).toString('base64');
        } else {
            return null;
        }
    }
};
