const fs = require('fs');

module.exports = {
    port: process.env.PORT || 3002,
    outerLayer: 'https://localhost:3001',

    sslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/gateway_client.crt'),
        key: fs.readFileSync(__dirname + '/ssl/gateway_client.key'),
        ca: fs.readFileSync(__dirname + '/ssl/gateway_ca.crt'),
        rejectUnauthorized: true
    }
};
