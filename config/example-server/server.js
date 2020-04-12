const path = require('path');

const express = require('express');

const port = process.env.PORT || 3000;

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', function (req, res, next) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/redirect', function (req, res, next) {
    res.redirect('/');
});

app.get('/headers', function (req, res, next) {
    res.json(req.headers);
});

app.get('/query', function (req, res, next) {
    res.json(req.query);
});

app.post('/body', function (req, res, next) {
    res.json(req.body);
});

app.post('/cookie', function (req, res, next) {
    res.cookie(req.body.key, req.body.value);
    res.sendStatus(200);
});

router.get('/healthz', function (req, res, next) {
    res.sendStatus(200);
});

app.use(function (req, res, next) {
    res.sendStatus(404);
});

app.use(function (err, req, res, next) {
    console.error(err);
    res.sendStatus(500);
});

app.listen(port, function () {
    console.log(`Listening on port ${port}...`);
});
