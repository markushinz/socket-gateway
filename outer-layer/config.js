const fs = require('fs');

const yaml = require('js-yaml');

const developmentMode = process.env.NODE_ENV === 'development';

const cache = {
    targets: {},
    timestamp: null
}

module.exports = {
    appPort: process.env.PORT || process.env.SG_APP_PORT || 80,
    socketPort: process.env.SG_SOCKET_PORT || 3000,

    timeout: process.env.SG_TIMEOUT || 60000, // ms

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
