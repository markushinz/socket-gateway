const policy = require('./policy');

const express = require('express');
const app = express();

app.use(express.json());

app.post('/', function (req, res) {
    if (req.body.host == null) {
        res.status(400).json({ message: 'Bad Request' });
        return;
    }

    req.body.port = req.body.port || 443;
    req.body.schema = req.body.schema || (req.body.port == 80) ? 'http' : 'https';
    req.body.path = req.body.path || '/';
    req.body.method = req.body.method || 'GET';

    req.body.url = req.body.schema + '://' + req.body.host + ':' + req.body.port + req.body.path;
    // console.log('URL: ', req.body.url);

    if (
        !['http', 'https'].includes(req.body.schema) ||
        req.body.host.includes('/') ||
        typeof (req.body.port) != 'number' ||
        req.body.port % 1 != 0 ||
        !['HEAD', 'GET', 'POST', 'PUT', 'DELETE'].includes(req.body.method)
    ) {
        res.status(400).json({ message: 'Bad Request', url: req.body.url });
        return;
    }

    if (policy.evaluatePolicy(req.body.host, req.body.port, req.body.path, req.body.method)) {
        app.get('gateway')(req, res);
    } else {
        res.status(403).json({ message: 'Forbidden', url: req.body.url });
    }
});

module.exports = app;
