export type Headers = Record<string, string | string[]>;

export function sanitizeHeaders(headers: Headers): Headers {
    const sanitizedHeaders: Headers = {};
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

export function rewriteObject(obj: Record<string, unknown>, fromHost: string, toHost: string): void {
    Object.keys(obj).forEach(function (key) {
        if (typeof obj[key] === 'object') {
            rewriteObject(obj[key] as Record<string, unknown>, fromHost, toHost);
        } else if (typeof obj[key] === 'string') {
            obj[key] = rewriteString(obj[key] as string, fromHost, toHost);
        }
    });
}

function rewriteString(str: string, fromHost: string, toHost: string) {
    if (toHost) {
        str = str.replace(new RegExp(encodeURIComponent(fromHost), 'g'), encodeURIComponent(toHost));
        return str.replace(new RegExp(fromHost, 'g'), toHost);
    } else {
        return str;
    }
}