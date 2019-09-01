const config = require('./config');

module.exports.evaluatePolicy = function (policy, path, method) {
    const methods = policy[path] || policy['*'];
    if (methods) {
        return methods.includes(method) || methods.includes('*');
    }
}

module.exports.getTarget = function (host) {
    try {
        return config.targets[host];
    } catch (error) {
        return undefined
    }
}
