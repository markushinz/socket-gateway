import { RequestListener } from 'http'

import { newAdminRouter } from './routers/admin'
import { newDefaultRouter } from './routers/default'
import { Gateway } from './gateway'
import { EvaluateTool } from './tools/evaluate'
import { OuterLayerConfig } from '.'
import { sendStatus } from '../helpers'

export function NewSocketApp(config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool): RequestListener {
    const adminRouter = newAdminRouter(config, gateway, evaluateTool)
    const defaultRouter = newDefaultRouter(gateway)
    return async function(req, res) {
        try {
            const url = new URL(req.url || '', `http://${req.headers.host}`)

            if (url.pathname.startsWith('/admin')) {
                return adminRouter(req, res)
            }

            if (['/challenge', '/challenge/'].includes(url.pathname) && req.method === 'GET') {
                const challenge = gateway.challengeTool.createChallenge()
                return sendStatus(req, res, 200, challenge)
            }

            return defaultRouter(req, res)
        } catch (err) {
            console.error(err)
            sendStatus(req, res, 500)
        }
    }
}
