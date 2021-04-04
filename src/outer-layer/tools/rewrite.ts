import { Headers } from '../../models'

export function sanitizeHeaders(headers: Headers): Headers {
    const sanitizedHeaders: Headers = {}
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
            sanitizedHeaders[key] = headers[key]
        }
    })
    return sanitizedHeaders
}

export function rewriteHeaders(headers: Headers, fromHost: string, toHost: string): Headers {
    return JSON.parse(rewriteString(JSON.stringify(headers), fromHost, toHost))
}

function rewriteString(str: string, fromHost: string, toHost: string) {
    if (toHost) {
        str = str.replace(new RegExp(encodeURIComponent(fromHost), 'g'), encodeURIComponent(toHost))
        return str.replace(new RegExp(fromHost, 'g'), toHost)
    } else {
        return str
    }
}