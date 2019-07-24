const fs = require('fs');

module.exports = {
    outerLayer: process.env.OUTER_LAYER || 'https://localhost:3001',

    tlsOptions: {
        cert: fs.readFileSync(process.env.INNER_LAYER_CERT || __dirname + '/config/innerLayer.crt'),
        key: fs.readFileSync(process.env.INNER_LAYER_KEY || __dirname + '/config/innerLayer.key'),
        ca: fs.readFileSync(process.env.OUTER_LAYER_CERT ||  __dirname + '/config/outerLayer.crt'),
        rejectUnauthorized: true
    }
};
