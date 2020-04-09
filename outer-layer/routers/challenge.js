const express = require('express');
const router = express.Router();

const challengeTool = require('../tools/challenge');

router.get('/', function (req, res, next) {
    setTimeout(function () {
        challengeTool.createChallenge().then(function (challenge) {
            res.send(challenge);
        }).catch(function (error) {
            console.error(error);
            res.sendStatus(500);
        });
    }, 1000);
});

module.exports = router;
