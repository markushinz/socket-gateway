import { Router, ErrorRequestHandler } from 'express'
const router = Router()

router.get('/healthz', function (req, res) {
    res.sendStatus(200)
})

router.use(function (req, res) {
    res.sendStatus(404)
})

router.use(function (err, req, res) {
    console.error(err)
    res.sendStatus(500)
} as ErrorRequestHandler)

export default router
