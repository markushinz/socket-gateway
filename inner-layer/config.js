const fs = require('fs');

module.exports = {
    outerLayer: process.env.OUTER_LAYER || 'https://localhost:3001',

    tlsOptions: {
        cert: fs.readFileSync(process.env.CLIENT_CERT || __dirname + '/tls/client.crt'),
        key: fs.readFileSync(process.env.CLIENT_KEY || __dirname + '/tls/client.key'),
        ca: fs.readFileSync(process.env.CA_CERT ||  __dirname + '/tls/ca.crt'),
        rejectUnauthorized: true
    }
};
