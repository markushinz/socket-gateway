import express, { Express } from 'express'
import compression from 'compression'

import { newAdminRouter } from './routers/admin'
import defaultRouter from './routers/default'
import { Gateway } from './gateway'
import { EvaluateTool } from './tools/evaluate'
import { OuterLayerConfig } from '.'

export function NewSocketApp (config: OuterLayerConfig, gateway: Gateway, evaluateTool: EvaluateTool): Express {
    const app = express()
    app.disable('x-powered-by')
    app.use(compression())
    app.use('/admin', newAdminRouter(config, gateway, evaluateTool))
    app.get('/challenge', async function (_req, res) {
        const challenge = await gateway.challengeTool.createChallenge()
        res.send(challenge)
    })
    
    app.use(defaultRouter)
    return app
} 
