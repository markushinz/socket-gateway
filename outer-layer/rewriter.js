const sanitizeHeaders = function (headers, ) {
    delete headers['host'];
    delete headers['accept'];
    delete headers['accept-charset'];
    delete headers['accept-encoding'];
    delete headers['accept-language'];
    delete headers['accept-ranges'];
    delete headers['cache-control'];
    delete headers['content-encoding'];
    // delete headers['content-language'];
    delete headers['content-length'];
    // delete headers['content-location'];
    delete headers['content-md5'];
    delete headers['content-range'];
    // delete headers['content-type'];
    delete headers['connection'];
    delete headers['date'];
    delete headers['expect'];
    delete headers['max-forwards'];
    delete headers['pragma'];
    delete headers['proxy-authorization'];
    delete headers['referer'];
    delete headers['te'];
    delete headers['transfer-encoding'];
    delete headers['user-agent'];
    delete headers['via'];
    return headers;
}

const rewriteObject = function (obj, fromHost, toHost) {
    Object.keys(obj).forEach(function (key) {
        if (typeof obj[key] === 'object') {
            obj[key] = rewriteObject(obj[key], fromHost, toHost);
        } else if (typeof obj[key] === 'string') {
            obj[key] = rewriteString(obj[key], fromHost, toHost);
        }
    });
    return obj;
}

const rewriteString = function (str, fromHost, toHost) {
    if (toHost) {
        return str.replace(new RegExp(fromHost, 'g'), toHost);
    } else {
        return str;
    }
}

module.exports = {
    sanitizeHeaders,
    rewriteObject,
    rewriteString
}
