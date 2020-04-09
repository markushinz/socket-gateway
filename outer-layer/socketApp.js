const express = require('express');
const compression = require('compression');

const adminRouter = require('./routers/admin');
const challengeRouter = require('./routers/challenge');
const defaultRouter = require('./routers/default');

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use('/admin', adminRouter);
app.use('/challenge', challengeRouter);
app.use(defaultRouter);

module.exports = app;
