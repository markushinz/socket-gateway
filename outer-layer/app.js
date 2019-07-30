const policy = require('./policy');

const express = require('express');
const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Static files hosting.
app.use(function (req, res, next) {
    if (req.method === 'GET' && staticFiles.has(req.path)) {
        return res.sendFile(__dirname + staticFiles.get(req.path));
    }
    next();
});

app.get('/ping', function (req, res, next) {
    app.get('gateway')('customPing', req, res, {});
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
    req.body.url = req.body.schema + '://' + req.body.host + ':' + req.body.port + req.body.path;

    // Validate input for schema, host, and method.
    if (
        !['http', 'https'].includes(req.body.schema) ||
        req.body.host.includes('/') ||
        !['HEAD', 'GET', 'POST', 'PUT', 'DELETE'].includes(req.body.method)
    ) {
        res.status(400).json({ message: 'Bad Request', url: req.body.url });
        return;
    }

    // Check if request is allowed by policies.
    if (policy.evaluatePolicy(req.body.host, req.body.port, req.body.path, req.body.method)) {
        const outgoingData = {
            host: req.body.host,
            url: req.body.url,
            method: req.body.method,
            headers: req.body.headers || {},
            query: req.body.query,
            body: req.body.body,
        };
        app.get('gateway')('request', req, res, outgoingData);
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
    url = 'https://' + host + ':443' + path;
    if (policy.evaluatePolicy(host, 443, path, req.method)) {
        const outgoingData = {
            host: host,
            url: url,
            method: req.method,
            headers: req.headers,
            query: req.query,
            body: req.body,
        };
        app.get('gateway')('request', req, res, outgoingData);
    } else {
        res.status(403).json({ message: 'Forbidden', url: url });
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
