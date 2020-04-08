const fs = require('fs');
const process = require('process');

const developmentMode = process.env.NODE_ENV === 'development';

if (developmentMode) {
    console.warn('Running in development mode...');
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

module.exports = {
    get outerLayer() {
        const uri = process.env.SG_OUTER_LAYER;
        if (developmentMode) {
            return uri || 'ws://localhost:3000';
        }
        if (uri.startsWith('https://') || uri.startsWith('wss://')) {
            return uri;
        }
        console.error('You have to specify an environment variable SG_OUTER_LAYER and the URI has to start with https:// or wss://');
        process.exit(1);
    },

    get tlsOptions() {
        if (developmentMode) {
            return { rejectUnauthorized: false };
        }
        if (process.env.SG_OUTER_LAYER_CERT) {
            return { ca: process.env.SG_OUTER_LAYER_CERT };
        }
        if (process.env.SG_OUTER_LAYER_CERT_FILE) {
            return { ca: fs.readFileSync(process.env.SG_OUTER_LAYER_CERT_FILE) };
        }
        return {};
    }
};
