const fs = require('fs');

module.exports = {
    appPort: process.env.PORT || process.env.APP_PORT || 443,
    appHTTPPort: process.env.APP_HTTP_PORT || 80,
    socketPort: process.env.SOCKET_PORT || 3000,

    appTlsOptions: {
        cert: fs.readFileSync(__dirname + '/config/server.crt'),
        key: fs.readFileSync(__dirname + '/config/server.key')
    },

    socketTlsOptions: {
        cert: fs.readFileSync(__dirname + '/config/outerLayer.crt'),
        key: fs.readFileSync(__dirname + '/config/outerLayer.key'),
        ca: fs.readFileSync(__dirname + '/config/innerLayer.crt'),
        requestCert: true,
        rejectUnauthorized: true
    },

    timeout: process.env.TIMEOUT || 10000 // ms
};

const configFile = __dirname + '/config/config.json';

module.exports.evaluatePolicy = function (host, port, path, method) {
    if (fs.existsSync(configFile)) {
        const policies = JSON.parse(fs.readFileSync(configFile)).policies;
        if (policies && policies[host]) {
            const paths = policies[host][port] || policies[host]['*'];
            if (paths) {
                const methods = paths[path] || paths['*'];
                if (methods) {
                    return methods.includes(method) || methods.includes('*');
                }
            }
        }
    }
    return false;
}

module.exports.mapHost = function (host) {
    if (fs.existsSync(configFile)) {
        const hosts = JSON.parse(fs.readFileSync(configFile)).hosts;
        return hosts[host];
    }
    return undefined;
}
