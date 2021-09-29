import { Headers } from './models'
import { request as httpRequest, RequestOptions, IncomingMessage, ClientRequest } from 'http'
import { request as httpsRequest } from 'https'

export async function requestLegacy(method: string, url: URL, headers: Headers, data?: string): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject) => {
        try {
            let requestor: (url: URL, options: RequestOptions, callback: (res: IncomingMessage) => void) => ClientRequest
            switch (url.protocol){
                case 'wss:':
                    url.protocol = 'https:'
                // falls through
                case 'https:':
                    requestor = httpsRequest
                    break
                case 'ws:':
                    url.protocol = 'http:'
                // falls through
                case 'http:':
                    requestor = httpRequest
                    break
                default:
                    throw new Error('Protocol must be http:, https:, ws: or wss:')
            }
            const req = requestor(url, {
                method,
                headers
            }, resolve)
            req.on('error', reject)

            if (data) {
                req.setHeader('content-length', data.length)
                req.write(data)
            }
            req.end()
        } catch (err) {
            reject(err)
        }
    })
}

export function request(method: string, url: URL, headers: Headers): { req: ClientRequest; res: Promise<IncomingMessage> } {
    let requestor: (url: URL, options: RequestOptions) => ClientRequest
    switch (url.protocol){
        case 'wss:':
            url.protocol = 'https:'
            // falls through
        case 'https:':
            requestor = httpsRequest
            break
        case 'ws:':
            url.protocol = 'http:'
            // falls through
        case 'http:':
            requestor = httpRequest
            break
        default:
            throw new Error('Protocol must be http:, https:, ws: or wss:')
    }
    const req = requestor(url, { method, headers })
    const res = new Promise<IncomingMessage>((resolve, reject) => {
        req.on('error', reject)
        req.on('response', resolve)
    })
    return { req, res }
}
