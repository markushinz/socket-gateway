const express = require('express');
const router = express.Router();

router.use(function (req, res, next) {
    res.sendStatus(404);
});

router.use(function (err, req, res, next) {
    console.error(err);
    res.sendStatus(500);
});

module.exports = router;
