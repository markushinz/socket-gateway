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

const staticFiles = new Map([
    ['/', '/public/index.html'],
    ['/script.js', '/public/script.js'],
    ['/stylesheet.css', '/public/stylesheet.css'],
    ['/favicon.ico', '/public/favicon.ico'],
    ['/clr-ui.min.css', '/node_modules/@clr/ui/clr-ui.min.css'],
    ['/clr-ui.min.css.map', '/node_modules/@clr/ui/clr-ui.min.css.map'],
    ['/clr-icons.min.css', '/node_modules/@clr/icons/clr-icons.min.css'],
    ['/clr-icons.min.css.map', '/node_modules/@clr/icons/clr-icons.min.css.map'],
    ['/clr-icons.min.js', '/node_modules/@clr/icons/clr-icons.min.js'],
    ['/vue.js', `/node_modules/vue/dist/${process.env.NODE_ENV === 'production' ? 'vue.min.js' : 'vue.js'}`],
]);

app.get('*', function (req, res, next) {
    if (staticFiles.has(req.path)) {
        return res.sendFile(__dirname + staticFiles.get(req.path));
    }
    next();
});

app.get('/ping', function (req, res, next) {
    app.get('gateway')('customPing', req.hostname, res, {});
});

app.post('/', function (req, res, next) {
    // Parse request body.
    try {
        switch (req.headers['content-type']) {
            case 'application/json':
                req.body = JSON.parse(req.body);
                break;
            case 'application/x-www-form-urlencoded':
                const body = {}
                req.body.split('&').forEach(function (splittedBody) {
                    pair = splittedBody.split('=');
                    body[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
                });
                req.body = body;
                break;
        }
    } catch (error) {
        return res.status(400).json({ message: 'Bad Request', error: 'Could not parse request body.' });
    }

    // Delete empty keys and try to parse json strings for headers, query, and body.
    Object.keys(req.body).forEach(function (key) {
        if (req.body[key] == '') {
            delete req.body[key];
        } else if (['headers', 'query', 'body'].includes(key) && typeof req.body[key] === 'string') {
            try {
                req.body[key] = JSON.parse(req.body[key]);
            } catch (err) {
                res.status(400).json({ message: 'Bad Request', error: `"${key}" must be a valid JSON.` });
            }
        }
    });

    // Check for required input (host).
    if (!req.body.host) {
        res.status(400).json({ message: 'Bad Request', error: '"host" must be provided.' });
        return;
    }

    // Set default values for optional parameters if not provided.
    req.body.port = parseInt(req.body.port || 443);
    req.body.schema = req.body.schema || (req.body.port == 80) ? 'http' : 'https';
    req.body.path = req.body.path || '/';
    req.body.method = req.body.method || 'GET';

    // Build url.
    const url = req.body.schema + '://' + req.body.host + ':' + req.body.port + req.body.path;

    // Validate input for method, schema, host and port.
    if (
        !['HEAD', 'GET', 'POST', 'PUT', 'DELETE'].includes(req.body.method) ||
        !['http', 'https'].includes(req.body.schema) ||
        req.body.host.includes('/') ||
        req.body.port == NaN || req.body.port < 0
    ) {
        res.status(400).json({ message: 'Bad Request', error: `Resulting url "${url}" is invalid.` });
        return;
    }

    // Check if request is allowed by policies.
    if (evaluator.evaluatePolicy(req.body.host, req.body.port, req.body.path, req.body.method)) {
        const headers = rewriter.sanitizeHeaders(req.body.headers || {});

        const outgoingData = {
            host: req.body.host,
            url,
            method: req.body.method,
            headers,
            query: req.body.query,
            body: JSON.stringify(req.body.body)
        };
        app.get('gateway')('request', null, res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', error: `" ${req.body.method} ${url}" is not allowed by policies.` });
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
