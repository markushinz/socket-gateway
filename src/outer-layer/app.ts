import { RequestListener } from 'http'

import { EvaluateTool } from './tools/evaluate'
import { RewriteTool } from './tools/rewrite'
import { Gateway } from './gateway'
import { newDefaultRouter } from './routers/default'

import { GatewayRequest, Headers } from '../models'
import { OuterLayerConfig } from '.'
import { sendStatus } from '../helpers'

export function NewApp (config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool, rewriteTool: RewriteTool): RequestListener {
    const next: RequestListener = function(_appReq, appRes) {
        sendStatus(appRes, 404)
    }
    return async function(appReq, appRes) {
        const appURL = new URL(appReq.url || '', `http://${appReq.headers.host}`)
        const target = evaluateTool.getTarget(appURL.hostname)
        if (!target) {
            return next(appReq,appRes)
        }
        const protocol = target.protocol || 'https'
        const port = target.port || (protocol === 'http' ? 80 : 443)
        const url = new URL(`${protocol}://${target.hostname}:${port}${appReq.url}`)
        const policy = target.policy || '*'

        if (evaluateTool.evaluatePolicy(policy, appURL.pathname, appReq.method || '')) {
            const rewriteHost = appURL.host
            const headers = rewriteTool.sanitizeHeaders(appReq.headers as Headers)
            // headers['x-real-ip'] = appReq.ip
            // headers['x-forwarded-for'] = [...appReq.ips, appReq.socket.remoteAddress].join(', ')
            // headers['x-forwarded-host'] = rewriteHost
            // if (config['trust-proxy'] && appReq.headers['x-forwarded-port']) {
            //     headers['x-forwarded-port'] = appReq.headers['x-forwarded-port']
            // } else if (!config['trust-proxy']) {
            //     headers['x-forwarded-port'] = app.get('port')
            // }
            // headers['x-forwarded-proto'] = appReq.protocol

            const chunks = []
            for await (const chunk of appReq) {
                chunks.push(chunk)
            }
            const body = Buffer.concat(chunks).toString()

            const gatewayReq = new GatewayRequest({
                method: appReq.method || '',
                url,
                headers,
                data: appReq.method == 'GET' ? undefined : body
            })

            gateway.request(target.identifier, url.host, rewriteHost, appRes, gatewayReq)
        } else {
            sendStatus(appRes, 403, `Forbidden: ${appReq.method} ${url} is not allowed by policy.`)
        }
    }
    // app.disable('x-powered-by')
    // app.disable('etag')
    // app.set('trust proxy', config['trust-proxy'])
    // app.use(morgan('dev'))

    // app.use(function (appReq, appRes, next) {

    // })

    // app.use(newDefaultRouter(gateway))

    // return app
}
