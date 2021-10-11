import { RequestListener } from 'http'

import { all } from 'proxy-addr'

import { EvaluateTool } from './tools/evaluate'
import { RewriteTool } from './tools/rewrite'
import { Gateway } from './gateway'
import { newDefaultRouter } from './routers/default'

import { GatewayRequest, Headers } from '../models'
import { OuterLayerConfig } from '.'
import { sendStatus } from '../helpers'

export function NewApp(config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool, rewriteTool: RewriteTool): RequestListener {
    const defaultRouter = newDefaultRouter(gateway)
    return async function(outerReq, outerRes) {
        try {
            const appURL = new URL(outerReq.url || '', `http://${outerReq.headers.host}`)
            const target = evaluateTool.getTarget(appURL.hostname)
            if (!target) {
                return defaultRouter(outerReq, outerRes)
            }
            const protocol = target.protocol || 'https'
            const port = target.port || (protocol === 'http' ? 80 : 443)
            const url = new URL(`${protocol}://${target.hostname}:${port}${appURL.pathname}${appURL.search}`)
            const policy = target.policy || '*'

            if (evaluateTool.evaluatePolicy(policy, appURL.pathname, outerReq.method || '')) {
                const rewriteHost = appURL.host
                const headers = rewriteTool.sanitizeHeaders(outerReq.headers as Headers)

                const realIP = outerReq.socket.remoteAddress
                const trustProxy = config['trust-proxy'](realIP || '', 0)
                headers['x-real-ip'] = realIP
                headers['x-forwarded-for'] = all(outerReq, config['trust-proxy']).reverse().join(', ')
                headers['x-forwarded-host'] = rewriteHost
                headers['x-forwarded-port'] = trustProxy ? outerReq.headers['x-forwarded-port'] || outerReq.socket.localPort : outerReq.socket.localPort
                headers['x-forwarded-proto'] = trustProxy ? outerReq.headers['x-forwarded-proto'] || 'http' : 'http'

                const gwReq: GatewayRequest = {
                    method: outerReq.method || '',
                    url: url.href,
                    headers
                }

                gateway.request(target.identifier, url.host, rewriteHost, outerReq, outerRes, gwReq)
            } else {
                sendStatus(outerReq, outerRes, 403, `Forbidden: ${outerReq.method} ${url} is not allowed by policy.`)
            }
        } catch (err) {
            console.error(err)
            sendStatus(outerReq, outerRes, 500)
        }
    }
}
