const fs = require('fs');

const config = require('./config');

module.exports.evaluateHost = function (host) {
    if (fs.existsSync(config.policiesFile)) {
        const policies = JSON.parse(fs.readFileSync(config.policiesFile));
        return policies[host];
    }
    return false;
}

module.exports.evaluatePolicy = function (host, port, path, method) {
    if (fs.existsSync(config.policiesFile)) {
        const policies = JSON.parse(fs.readFileSync(config.policiesFile));
        if (policies[host]) {
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
