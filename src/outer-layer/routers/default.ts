import { Router, ErrorRequestHandler } from 'express'
import { Gateway } from '../gateway'

export function newDefaultRouter(gateway: Gateway): Router {
    const router = Router()

    router.get('/healthz', function (_req, res) {
        res.sendStatus(200)
    })

    router.get('/readyz', function (_req, res) {
        res.sendStatus(gateway.connections.length > 0 ? 200: 502)
    })
    
    router.use(function (_req, res) {
        res.sendStatus(404)
    })
    
    router.use(function (err, _req, res) {
        console.error(err)
        res.sendStatus(500)
    } as ErrorRequestHandler)

    return router
}
