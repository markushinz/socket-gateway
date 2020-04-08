const fs = require('fs');

if (process.env.NODE_ENV === 'development') {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

module.exports = {
    // TODO: Make sure this is https or wss
    outerLayer: process.env.SG_OUTER_LAYER || 'wss://localhost:3000',

    get tlsOptions() {
        if (process.env.NODE_ENV === 'development') {
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
