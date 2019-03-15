const fs = require('fs');

const parseCertificateAuthorities = function () {
    const certificateAuthoritiesFile = process.env.CERTIFICATE_AUTHORITIES_FILE || __dirname + '/certificateAuthorities.json'
    const certificateAuthorities = fs.existsSync(certificateAuthoritiesFile) ? JSON.parse(fs.readFileSync(certificateAuthoritiesFile)) : {}
    Object.keys(certificateAuthorities).forEach(function (host) {
        for (let i = 0; i < certificateAuthorities[host].length; i++) {
            certificateAuthorities[host][i] = fs.readFileSync((process.env.CERTIFICATE_AUTHORITIES_BASE_PATH || __dirname + '/ssl/') + certificateAuthorities[host][i]);
        }
    });
    return certificateAuthorities;
}

module.exports = {
    outerLayer: process.env.OUTER_LAYER || 'https://localhost:3001',

    sslOptions: {
        cert: fs.readFileSync(process.env.CLIENT_CERT || __dirname + '/ssl/client.crt'),
        key: fs.readFileSync(process.env.CLIENT_KEY || __dirname + '/ssl/client.key'),
        ca: fs.readFileSync(process.env.CA_CERT ||  __dirname + '/ssl/ca.crt'),
        rejectUnauthorized: true
    },

    certificateAuthorities: parseCertificateAuthorities()
};
