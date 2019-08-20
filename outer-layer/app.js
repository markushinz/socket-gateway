const evaluator = require('./evaluator');
const rewriter = require('./rewriter');

const express = require('express');
const app = express();
app.disable('x-powered-by');
app.use(express.text({ type: '*/*' }));

app.use(function (req, res, next) {
    const mapping = evaluator.mapHost(req.hostname);
    if (!mapping) {
        return next();
    }
    const host = mapping.host;
    const port = mapping.port || 443;

    const url = 'https://' + host + ":" + port + req.path;
    if (evaluator.evaluatePolicy(host, port, req.path, req.method)) {
        const rewriteHost = req.hostname;
        const headers = rewriter.sanitizeHeaders(req.headers);
        const body = req.body === 'string' ? req.body : '';

        const outgoingData = {
            host,
            url,
            method: req.method,
            headers,
            query: req.query,
            body
        };
        app.get('gateway')('request', rewriteHost, res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', error: `"${req.method} ${url}" is not allowed by policies.` });
    }
});

app.get('/', function (req, res, next) {
    app.get('gateway')('customPing', req.hostname, res, {});
});

app.use(function (req, res, next) {
    res.status(404).json({ message: 'Not Found' });
});

app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
