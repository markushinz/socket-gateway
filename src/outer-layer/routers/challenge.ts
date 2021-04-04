import { Router } from 'express'

import { Gateway } from '../gateway'

const router = Router()

router.get('/', async function (req, res) {
    const challenge = await (req.app.get('gateway') as Gateway).challengeTool.createChallenge()
    res.send(challenge)
})

export default router
