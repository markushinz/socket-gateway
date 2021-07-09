import express, { Express } from 'express'
import compression from 'compression'

import { newAdminRouter } from './routers/admin'
import challengeRouter from './routers/challenge'
import defaultRouter from './routers/default'
import { OuterLayerConfig } from './config'

export function NewSocketApp (config: OuterLayerConfig): Express {
    const app = express()
    app.disable('x-powered-by')
    app.use(compression())
    app.use('/admin', newAdminRouter(config))
    app.use('/challenge', challengeRouter)
    app.use(defaultRouter)
    return app
} 
