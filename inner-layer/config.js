const fs = require('fs');

if (process.env.NODE_ENV !== 'production') {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

module.exports = {
    outerLayer: process.env.OUTER_LAYER || 'https://localhost:3000',

    tlsOptions: {
        cert: fs.readFileSync(__dirname + '/config/innerLayer.crt'),
        key: fs.readFileSync(__dirname + '/config/innerLayer.key'),
        ca: fs.readFileSync(__dirname + '/config/outerLayer.crt'),
        rejectUnauthorized: true
    }
};
