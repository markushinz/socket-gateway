const sanitizeHeaders = function (headers) {
    const sanitizedHeaders = {};
    Object.keys(headers).forEach(function (key) {
        if (![
            'host',
            'connection',
            'te',
            'transfer-encoding',
            'keep-alive',
            'proxy-authorization',
            'proxy-authentication',
            'trailer',
            'upgrade',
            'content-length'
        ].includes(key)) {
            sanitizedHeaders[key] = headers[key];
        }
    });
    return sanitizedHeaders;
}

const rewriteObject = function (obj, fromHost, toHost) {
    Object.keys(obj).forEach(function (key) {
        if (typeof obj[key] === 'object') {
            rewriteObject(obj[key], fromHost, toHost);
        } else if (typeof obj[key] === 'string') {
            obj[key] = rewriteString(obj[key], fromHost, toHost);
        }
    });
}

const rewriteString = function (str, fromHost, toHost) {
    if (!!toHost) {
        str = str.replace(new RegExp(encodeURIComponent(fromHost), 'g'), encodeURIComponent(toHost));
        return str.replace(new RegExp(fromHost, 'g'), toHost);
    } else {
        return str;
    }
}

module.exports = {
    sanitizeHeaders,
    rewriteObject
}
