const config = require('./config');

const socket = require('./socket');
const express = require('express');

const app = express();

app.get('/', function (req, res) {
  res.send('Hello World!')
});

module.exports = app;