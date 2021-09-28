import { ServerResponse, STATUS_CODES } from 'http'
import { Headers } from './models'

export function log(res: ServerResponse): void {
    process.stdout.write(`\x1b[0m${res.req.method} ${res.req.url} \x1b[${color(res.statusCode)}m${res.statusCode}\x1b[0m\n`)
}

export function sendStatus(res: ServerResponse, status: number, body?: string | string[]): void {
    res.statusCode = status
    const statusMessage = STATUS_CODES[status]
    if (statusMessage) {
        res.statusMessage = statusMessage
    }
    if(!res.hasHeader('content-type')) {
        res.setHeader('content-type', 'text/plain; charset=utf-8')
    }
    if (body) {
        body = [body].flat()
        body.forEach(data => res.write(data))
    } else if (statusMessage) {
        res.write(statusMessage)
    }
    res.end()
    log(res)
}

export function setHeaders(res: ServerResponse, headers: Headers): void {
    for (const [key, value] of Object.entries(headers)) {
        if (value) {
            res.setHeader(key,value)
        }
    }

}

export function color(status: number): number {
    switch(true){
    case (status >= 500): return 31
    case (status >= 400): return 33
    case (status >= 300): return 36
    case (status >= 200): return 32
    default: return 0
    }
}