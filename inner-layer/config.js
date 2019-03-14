const fs = require('fs');

const parseCertificateAuthorities = function () {
    const certificateAuthoritiesFile = process.env.CERTIFICATE_AUTHORITIES_FILE ||  __dirname + '/certificateAuthorities.json'
    const certificateAuthorities = fs.existsSync(certificateAuthoritiesFile) ? JSON.parse(fs.readFileSync(certificateAuthoritiesFile)) : {}
    Object.keys(certificateAuthorities).forEach(function (host) {
        for (let i = 0; i < certificateAuthorities[host].length; i++) {
            certificateAuthorities[host][i] = fs.readFileSync(__dirname + certificateAuthorities[host][i]);
        }
    });
    return certificateAuthorities;
}

module.exports = {
    outerLayer: process.env.OUTER_LAYER || 'https://localhost:3001',

    sslOptions: {
        cert: fs.readFileSync(__dirname + '/ssl/client.crt'),
        key: fs.readFileSync(__dirname + '/ssl/client.key'),
        ca: fs.readFileSync(__dirname + '/ssl/ca.crt'),
        rejectUnauthorized: true
    },

    certificateAuthorities: parseCertificateAuthorities()
};
