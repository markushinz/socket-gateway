const fs = require('fs');

const parseCas = function () {
    const casFile = process.env.CAS_FILE || __dirname + '/cas.json'
    const cas = fs.existsSync(casFile) ? JSON.parse(fs.readFileSync(casFile)) : {}
    Object.keys(cas).forEach(function (host) {
        for (let i = 0; i < cas[host].length; i++) {
            cas[host][i] = fs.readFileSync(__dirname + cas[host][i]);
        }
    });
    return cas;
}

module.exports = {
    outerLayer: process.env.OUTER_LAYER || 'https://localhost:3001',

    sslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/client.crt'),
        key: fs.readFileSync(__dirname + '/ssl/client.key'),
        ca: fs.readFileSync(__dirname + '/ssl/ca.crt'),
        rejectUnauthorized: true
    },

    cas: parseCas()
};
