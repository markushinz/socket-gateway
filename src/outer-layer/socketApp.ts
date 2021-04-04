import express from 'express'
import compression from 'compression'

import adminRouter from './routers/admin'
import challengeRouter from './routers/challenge'
import defaultRouter from './routers/default'

const app = express()
app.disable('x-powered-by')
app.use(compression())
app.use('/admin', adminRouter)
app.use('/challenge', challengeRouter)
app.use(defaultRouter)

export default app
