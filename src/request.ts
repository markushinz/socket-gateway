import { Headers } from './models'
import { request as httpRequest, RequestOptions, IncomingMessage, ClientRequest } from 'http'
import { request as httpsRequest, Agent, AgentOptions } from 'https'

export function request(method: string, url: URL, headers: Headers, httpsAgentOptions?: AgentOptions): { req: ClientRequest; res: Promise<IncomingMessage> } {
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
    const agent = httpsAgentOptions && ['https:', 'wss:'].includes(url.protocol) ? new Agent(httpsAgentOptions) : undefined
    const req = requestor(url, { method, headers, agent })
    const res = new Promise<IncomingMessage>((resolve, reject) => {
        req.on('error', reject)
        req.on('response', resolve)
    })
    return { req, res }
}
