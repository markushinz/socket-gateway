const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const evaluator = require('./evaluator');
const rewriter = require('./rewriter');

const app = express();
app.disable('x-powered-by');
app.use(compression());
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

        app.get('gateway').request(rewriteHost, res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', error: `${req.method} ${url} is not allowed by policy.` });
    }
});

app.get('/admin', function (req, res, next) {
    if (config.adminCredentials) {
        if (req.headers.authorization === `Basic ${config.adminCredentials}`) {
            const innerLayers = app.get('gateway').innerLayers
            res.setHeader('content-type', 'text/html; charset=utf-8')
            res.send(`<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="utf-8">
                <title>Socket Gateway</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            
            <body>
                <h1>Socket Gateway</h1>
                <h3>Inner Layers</h3>
                <pre>${JSON.stringify(innerLayers, null, 4)}</pre>
                <h3>Targets</h3>
                <pre>${JSON.stringify(config.targets, null, 4)}</pre>
            </body>
            
            </html>`);
        } else {
            res.setHeader('www-authenticate', 'Basic realm="Socket Gateway"')
            res.status(401).json({ message: 'Unauthorized' });
        }
    } else {
        next();
    }
});

app.use(function (req, res, next) {
    res.status(404).json({ message: 'Not Found' });
});

app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
