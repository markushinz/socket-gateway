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

app.listen(port, function () {
    console.log(`Listening on port ${port}...`);
});
