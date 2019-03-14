const policy = require('./policy');

const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/index.html');
})

app.post('/', function (req, res, next) {

    Object.keys(req.body).forEach(function (key) {
        if (req.body[key] == '') {
            delete req.body[key];
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
    // console.log('URL: ', req.body.url);

    if (
        !['http', 'https'].includes(req.body.schema) ||
        req.body.host.includes('/') ||
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

app.use(function (req, res, next) {
    res.status(404).json({ message: 'Not Found' });
});

// error handler
app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
