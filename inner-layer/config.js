const fs = require('fs');

const parseCas = function () {
    const cas = fs.existsSync(__dirname + '/cas.json') ? JSON.parse(fs.readFileSync(__dirname + '/cas.json')) : {}
    Object.keys(cas).forEach(function (host) {
        for (let i = 0; i < cas[host].length; i++) {
            cas[host][i] = fs.readFileSync(__dirname + cas[host][i]);
        }
    });
    return cas;
}

module.exports = {
    port: process.env.PORT || 3002,
    outerLayer: 'https://localhost:3001',

    sslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/client.crt'),
        key: fs.readFileSync(__dirname + '/ssl/client.key'),
        ca: fs.readFileSync(__dirname + '/ssl/ca.crt'),
        rejectUnauthorized: true
    },

    cas: parseCas()
};
