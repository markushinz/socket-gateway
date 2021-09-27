import express, { Express } from 'express'
import morgan from 'morgan'

import { EvaluateTool } from './tools/evaluate'
import { RewriteTool } from './tools/rewrite'
import { Gateway } from './gateway'
import { newDefaultRouter } from './routers/default'

import { GatewayRequest, Headers } from '../models'
import { OuterLayerConfig } from '.'

export function NewApp (config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool, rewriteTool: RewriteTool): Express {
    const app = express()
    app.disable('x-powered-by')
    app.disable('etag')
    app.set('trust proxy', config['trust-proxy'])
    app.use(morgan('dev'))

    app.use(function (appReq, appRes, next) {
        const target = evaluateTool.getTarget(appReq.hostname.split(':')[0])
        if (!target) {
            return next()
        }
        const protocol = target.protocol || 'https'
        const port = target.port || (protocol === 'http' ? 80 : 443)
        const url = new URL(`${protocol}://${target.hostname}:${port}${appReq.originalUrl}`)
        const policy = target.policy || '*'

        if (evaluateTool.evaluatePolicy(policy, appReq.path, appReq.method)) {
            const rewriteHost = appReq.hostname
            const headers = rewriteTool.sanitizeHeaders(appReq.headers as Headers)
            headers['x-real-ip'] = appReq.ip
            headers['x-forwarded-for'] = [...appReq.ips, appReq.socket.remoteAddress].join(', ')
            headers['x-forwarded-host'] = rewriteHost
            if (config['trust-proxy'] && appReq.headers['x-forwarded-port']) {
                headers['x-forwarded-port'] = appReq.headers['x-forwarded-port']
            } else if (!config['trust-proxy']) {
                headers['x-forwarded-port'] = app.get('port')
            }
            headers['x-forwarded-proto'] = appReq.protocol

            const gatewayReq = new GatewayRequest({
                method: appReq.method,
                url,
                headers,
                data: appReq.method == 'GET' ? undefined : appReq.body
            })

            gateway.request(target.identifier, url.host, rewriteHost, appRes, gatewayReq)
        } else {
            appRes.status(403).type('text').send(`Forbidden: ${appReq.method} ${url} is not allowed by policy.`)
        }
    })

    app.use(newDefaultRouter(gateway))

    return app
}
