import { ServerResponse, STATUS_CODES } from 'http'
import { Headers } from './models'

export function sendStatus(res: ServerResponse, status: number, body?: string | string[]): void {
    res.statusCode = status
    const statusMessage = STATUS_CODES[status]
    if (statusMessage) {
        res.statusMessage = statusMessage
    }
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    if (body) {
        body = [body].flat()
        body.forEach(data => res.write(data))
    } else if (statusMessage) {
        res.write(statusMessage)
    }
    res.end()
}

export function set(res: ServerResponse, headers: Headers): void {
    for (const [key, value] of Object.entries(headers)) {
        if (value) {
            res.setHeader(key,value)
        }
    }

}
