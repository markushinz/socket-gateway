const policy = require('./policy');

const express = require('express');
const app = express();

app.use(express.json());

app.post('/', function (req, res) {
    if (req.body.url == null || req.body.method == null) {
        res.status(400).json({ message: 'Bad Request' });
        return;
    }

    if (policy.evaluatePolicy(req.body.url, req.body.method)) {
        app.get('gateway')(req, res);
    } else {
        res.status(403).json({ message: 'Forbidden' });
    }
});

module.exports = app;
