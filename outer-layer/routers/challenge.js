const express = require('express');
const router = express.Router();

const challengeTool = require('../tools/challenge');

router.get('/', async function (req, res, next) {
    const challenge = await challengeTool.createChallenge();
    res.send(challenge);
});

module.exports = router;
