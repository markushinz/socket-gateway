import { RequestListener } from 'http'
import { sendStatus } from '../../helpers'
import { Gateway } from '../gateway'

export function newDefaultRouter(gateway: Gateway): RequestListener {
    return function(req, res) {
        if (req.method === 'GET') {
            const url = new URL(req.url || '', `http://${req.headers.host}`)
            if (['/healthz', '/healthz/'].includes(url.pathname)) {
                return sendStatus(req, res, 200)
            }
            if (['/readyz', '/readyz/'].includes(url.pathname)) {
                return sendStatus(req, res, gateway.connections.length > 0 ? 200: 502)
            }
        }
        return sendStatus(req, res, 404)
    }
}
