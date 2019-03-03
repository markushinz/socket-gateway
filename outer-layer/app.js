const express = require('express');

const app = express();

app.get('/', function (req, res) {
    app.get('proxy')(req, res);
});

module.exports = app;