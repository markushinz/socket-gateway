import express from 'express';
const router = express.Router();

import { createChallenge } from '../tools/challenge';

router.get('/', async function (req, res) {
    const challenge = await createChallenge();
    res.send(challenge);
});

export default router;
