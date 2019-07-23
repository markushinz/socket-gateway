const policy = require('./policy');

const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/public/index.html');
})

app.get('/ping', function (req, res, next) {
    app.get('gateway')('customPing', req, res, {});
})

app.post('/', function (req, res, next) {
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

    if (!req.body.host) {
        res.status(400).json({ message: 'Bad Request' });
        return;
    }

    req.body.port = req.body.port || 443;
    req.body.schema = req.body.schema || (req.body.port == 80) ? 'http' : 'https';
    req.body.path = req.body.path || '/';
    req.body.method = req.body.method || 'GET';

    req.body.url = req.body.schema + '://' + req.body.host + ':' + req.body.port + req.body.path;

    if (
        !['http', 'https'].includes(req.body.schema) ||
        req.body.host.includes('/') ||
        !['HEAD', 'GET', 'POST', 'PUT', 'DELETE'].includes(req.body.method)
    ) {
        res.status(400).json({ message: 'Bad Request', url: req.body.url });
        return;
    }

    if (policy.evaluatePolicy(req.body.host, req.body.port, req.body.path, req.body.method)) {
        const outgoingData = {
            host: req.body.host,
            url: req.body.url,
            method: req.body.method,
            headers: req.body.headers,
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
    if (!policy.evaluateHost(host)) {
        return next();
    }
    path = '/' + pathParts.slice(2).join('/');
    url = 'https://' + host + ':443' + path;
    headers = req.headers;
    delete headers['host'];
    delete headers['accept'];
    delete headers['accept-charset'];
    delete headers['accept-encoding'];
    delete headers['accept-language'];
    delete headers['accept-ranges'];
    delete headers['cache-control'];
    delete headers['content-encoding'];
    delete headers['content-language'];
    delete headers['content-length'];
    delete headers['content-location'];
    delete headers['content-md5'];
    delete headers['content-range'];
    delete headers['content-type'];
    delete headers['connection'];
    delete headers['date'];
    delete headers['expect'];
    delete headers['max-forwards'];
    delete headers['pragma'];
    delete headers['proxy-authorization'];
    delete headers['referer'];
    delete headers['te'];
    delete headers['transfer-encoding'];
    delete headers['user-agent'];
    delete headers['via'];
    if (policy.evaluatePolicy(host, 443, path, req.method)) {
        const outgoingData = {
            host: host,
            url: url,
            method: req.method,
            headers: headers,
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
