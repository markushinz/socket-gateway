const config = require('./config');

module.exports.evaluatePolicy = function (url, method) {
    return config.policies[url] && (
        config.policies[url].includes(method) ||
        config.policies[url].includes('*')
    );
}
