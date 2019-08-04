const rewriter = require('./rewriter');
const config = require('./config');

const express = require('express');
const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(function (req, res, next) {
    const host = config.mapHost(req.host);
    if (!host) {
        return next();
    }
    const url = 'https://' + host + req.path;
    if (config.evaluatePolicy(host, 443, req.path, req.method)) {
        const rewriteHost = req.host;
        const headers = rewriter.sanitizeHeaders(req.headers);

        const outgoingData = {
            host,
            url,
            method: req.method,
            headers,
            query: req.query,
            body: req.body,
        };
        app.get('gateway')('request', rewriteHost, res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', url });
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
    app.get('gateway')('customPing', req.host, res, {});
})

app.post('/', function (req, res, next) {
    // Delete empty keys and try to parse json strings for headers, query, and body.
    Object.keys(req.body).forEach(function (key) {
        if (req.body[key] == '') {
            delete req.body[key];
        } else if (['headers', 'query', 'body'].includes(key) && typeof req.body[key] === 'string') {
            try {
                req.body[key] = JSON.parse(req.body[key]);
            } catch (err) {
                res.status(400).json({ message: 'Bad Request' });
            }
        }
    });

    // Check for required input.
    if (!req.body.host) {
        res.status(400).json({ message: 'Bad Request' });
        return;
    }

    // Set default values for optional parameters if not provided.
    req.body.port = req.body.port || 443;
    req.body.schema = req.body.schema || (req.body.port == 80) ? 'http' : 'https';
    req.body.path = req.body.path || '/';
    req.body.method = req.body.method || 'GET';

    // Build url.
    const url = req.body.schema + '://' + req.body.host + ':' + req.body.port + req.body.path;

    // Validate input for schema, host, and method.
    if (
        !['http', 'https'].includes(req.body.schema) ||
        req.body.host.includes('/') ||
        !['HEAD', 'GET', 'POST', 'PUT', 'DELETE'].includes(req.body.method)
    ) {
        res.status(400).json({ message: 'Bad Request', url });
        return;
    }

    // Check if request is allowed by policies.
    if (config.evaluatePolicy(req.body.host, req.body.port, req.body.path, req.body.method)) {
        const headers = rewriter.sanitizeHeaders(req.body.headers || {});

        const outgoingData = {
            host: req.body.host,
            url,
            method: req.body.method,
            headers,
            query: req.body.query,
            body: req.body.body,
        };
        app.get('gateway')('request', null, res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', url: req.body.url });
    }
});

app.use(function (req, res, next) {
    const pathParts = req.path.split('/');
    if (pathParts.length < 2) {
        return next();
    }
    host = pathParts[1];
    path = '/' + pathParts.slice(2).join('/');
    const url = 'https://' + host + path;
    if (config.evaluatePolicy(host, 443, path, req.method)) {
        const headers = rewriter.sanitizeHeaders(req.headers);

        const outgoingData = {
            host,
            url,
            method: req.method,
            headers,
            query: req.query,
            body: req.body,
        };
        app.get('gateway')('request', null, res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', url });
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
