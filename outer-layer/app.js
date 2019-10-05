const evaluator = require('./evaluator');
const rewriter = require('./rewriter');

const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
app.disable('x-powered-by');
app.use(express.text({ type: '*/*' }));
app.use(cookieParser());

app.use(function (req, res, next) {
    const target = evaluator.getTarget(req.hostname);
    if (!target) {
        return next();
    }
    const protocol = target.protocol || 'https';
    const host = target.host;
    const port = target.port || 443;

    const url = protocol + '://' + host + ":" + port + req.path;

    const policy = target.policy || { '*': '*' };

    if (evaluator.evaluatePolicy(policy, req.path, req.method)) {
        const rewriteHost = req.hostname;
        const headers = rewriter.sanitizeHeaders(req.headers);
        headers['x-forwarded-for'] = req.ip;
        headers['x-forwarded-host'] = rewriteHost;
        headers['x-forwarded-proto'] = 'https';
        const body = typeof req.body === 'string' ? req.body : undefined;

        const outgoingData = {
            host,
            url,
            method: req.method,
            headers,
            query: req.query,
            body
        };

        app.get('gateway')('request', rewriteHost, req.cookies['x-socket-gateway-inner-layer-id'], res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', error: `${req.method} ${url} is not allowed by policy.` });
    }
});

app.get('/', function (req, res, next) {
    app.get('gateway')('customPing', req.hostname, undefined, res, {});
});

app.use(function (req, res, next) {
    res.status(404).json({ message: 'Not Found' });
});

app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
