const express = require('express');

const app = express();

app.get('/', function (req, res) {
    app.get('gateway')(req, res);
});

module.exports = app;