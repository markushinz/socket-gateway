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
    return async function(appReq, appRes) {
        const appURL = new URL(appReq.url || '/', `http://${appReq.headers.host}`)
        const target = evaluateTool.getTarget(appURL.hostname)
        if (!target) {
            return defaultRouter(appReq, appRes)
        }
        const protocol = target.protocol || 'https'
        const port = target.port || (protocol === 'http' ? 80 : 443)
        const url = new URL(`${protocol}://${target.hostname}:${port}${appReq.url}`)
        const policy = target.policy || '*'

        if (evaluateTool.evaluatePolicy(policy, appURL.pathname, appReq.method || 'GET')) {
            const rewriteHost = appURL.host
            const headers = rewriteTool.sanitizeHeaders(appReq.headers as Headers)

            const realIP = appReq.socket.remoteAddress
            const trustProxy = config['trust-proxy'](realIP || '', 0)
            headers['x-real-ip'] = realIP
            headers['x-forwarded-for'] = all(appReq, config['trust-proxy']).reverse().join(', ')
            headers['x-forwarded-host'] = rewriteHost
            headers['x-forwarded-port'] = trustProxy ? appReq.headers['x-forwarded-port'] || appReq.socket.localPort : appReq.socket.localPort
            headers['x-forwarded-proto'] = trustProxy ? appReq.headers['x-forwarded-proto'] || 'http' : 'http'

            const chunks = []
            for await (const chunk of appReq) {
                chunks.push(chunk)
            }
            const body = Buffer.concat(chunks).toString()
            const method = appReq.method || 'GET'
            const gwReq = new GatewayRequest({
                method,
                url,
                headers,
                data: method == 'GET' ? undefined : body
            })

            gateway.request(target.identifier, url.host, rewriteHost, appReq, appRes, gwReq)
        } else {
            sendStatus(appReq, appRes, 403, `Forbidden: ${appReq.method} ${url} is not allowed by policy.`)
        }
    }
}
