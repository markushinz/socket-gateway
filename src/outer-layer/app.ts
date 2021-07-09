import express, { Express } from 'express'
import compression from 'compression'
import morgan from 'morgan'

import { getTarget, evaluatePolicy } from './tools/evaluate'
import { sanitizeHeaders } from './tools/rewrite'
import { Gateway } from './gateway'
import defaultRouter from './routers/default'

import { Headers } from '../models'
import { OuterLayerConfig } from './config'

export function NewApp (config: OuterLayerConfig): Express {
    const app = express()
    app.disable('x-powered-by')
    app.disable('etag')
    app.set('trust proxy', config.trustProxy)
    app.use(compression())
    app.use(express.text({ type: '*/*' }))
    app.use(morgan('dev'))

    app.use(function (req, res, next) {
        const target = getTarget(config.targetsParsed, req.hostname.split(':')[0])
        if (!target) {
            return next()
        }
        const protocol = target.protocol || 'https'
        const hostname = target.hostname
        const port = target.port || (protocol === 'http' ? 80 : 443)
        const url = protocol + '://' + hostname + ':' + port + req.path

        const policy = target.policy || { '*': ['*'] }

        if (evaluatePolicy(policy, req.path, req.method)) {
            const rewriteHost = req.hostname
            const headers = sanitizeHeaders(req.headers as Headers)
            headers['x-real-ip'] = req.ip
            headers['x-forwarded-for'] = config.trustProxy ? req.ips.join(', ') : req.ip
            headers['x-forwarded-host'] = rewriteHost
            if (config.trustProxy && req.headers['x-forwarded-port']) {
                headers['x-forwarded-port'] = req.headers['x-forwarded-port']
            } else if (!config.trustProxy) {
                headers['x-forwarded-port'] = app.get('port')
            }
            headers['x-forwarded-proto'] = req.protocol

            const body = typeof req.body === 'string' ? req.body : undefined

            const outgoingData = {
                host: `${hostname}:${port}`,
                url,
                method: req.method,
                headers,
                query: req.query,
                body
            };

            (app.get('gateway') as Gateway).request(rewriteHost, res, outgoingData)
        } else {
            res.status(403).type('text').send(`Forbidden: ${req.method} ${url} is not allowed by policy.`)
        }
    })

    app.use(defaultRouter)

    return app
}
