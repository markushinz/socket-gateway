import { Headers } from './models'
import { request as httpRequest, RequestOptions, IncomingMessage, ClientRequest } from 'http'
import { request as httpsRequest } from 'https'

export async function request(method: string, url: URL, headers: Headers, data?: string):Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject) => {
        try {
            let requestor: (url: URL, options: RequestOptions, callback: (res: IncomingMessage) => void) => ClientRequest
            switch(url.protocol){
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
            if (data) {
                headers['content-length'] = `${data.length}`
            }
            const req = requestor(url, {
                method,
                headers
            }, resolve)

            req.on('error', reject)

            if (data) {
                req.write(data)
            }
            req.end()
        } catch(err) {
            reject(err)
        }
    })
}
