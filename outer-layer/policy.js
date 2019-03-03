const config = require('./config');

module.exports.evaluatePolicy = function (host, port, path, method) {
    if (config.policies[host]) {
        const paths = config.policies[host][port] || config.policies[host]['*'];
        if (paths) {
            const methods = paths[path] || paths['*'];
            if (methods) {
                return methods.includes(method) || methods.includes('*');
            }
        }
    }
    return false;
}
