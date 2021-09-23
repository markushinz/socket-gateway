import { Headers } from '../../models'


export class RewriteTool {
    blacklist = [
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
    ]

    constructor (public removeCSPs: boolean) {
        if (removeCSPs) {
            this.blacklist.push('content-security-policy')
        }
    }

    sanitizeHeaders(headers: Headers): Headers {
        const sanitizedHeaders: Headers = {}
        Object.keys(headers).forEach(key => {
            if (!this.blacklist.includes(key)) {
                sanitizedHeaders[key] = headers[key]
            }
        })
        return sanitizedHeaders
    }

    rewriteHeaders(headers: Headers, fromHost: string, toHost: string): Headers {
        return JSON.parse(rewriteString(JSON.stringify(headers), fromHost, toHost))
    }
}

function rewriteString(str: string, fromHost: string, toHost: string) {
    str = str.replace(new RegExp(encodeURIComponent(fromHost), 'g'), encodeURIComponent(toHost))
    return str.replace(new RegExp(fromHost, 'g'), toHost)
}
