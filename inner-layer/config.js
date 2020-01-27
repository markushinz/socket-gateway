const fs = require('fs');

if (process.env.NODE_ENV !== 'production') {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

module.exports = {
    outerLayer: process.env.SG_OUTER_LAYER || 'wss://localhost:3000',

    tlsOptions: {
        cert: process.env.SG_INNER_LAYER_CERT ||
            fs.readFileSync(process.env.SG_INNER_LAYER_CERT_FILE || __dirname + '/config/innerLayer.crt'),
        key: process.env.SG_INNER_LAYER_KEY ||
            fs.readFileSync(process.env.SG_INNER_LAYER_KEY_FILE || __dirname + '/config/innerLayer.key'),
        ca: process.env.SG_OUTER_LAYER_CERT ||
            fs.readFileSync(process.env.SG_OUTER_LAYER_CERT_FILE || __dirname + '/config/outerLayer.crt'),
        rejectUnauthorized: true
    }
};
