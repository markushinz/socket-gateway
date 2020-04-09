const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const evaluator = require('./evaluator');
const rewriter = require('./rewriter');

const adminRouter = require('./admin/router');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(compression());
app.use(express.text({ type: '*/*' }));
app.use(cookieParser());

app.use(function (req, res, next) {
    const target = evaluator.getTarget(req.hostname.split(':')[0]);
    if (!target) {
        return next();
    }
    const protocol = target.protocol || 'https';
    const hostname = target.hostname;
    const port = target.port || (protocol === 'http' ? 80 : 443);
    const url = protocol + '://' + hostname + ":" + port + req.path;

    const policy = target.policy || { '*': '*' };

    if (evaluator.evaluatePolicy(policy, req.path, req.method)) {
        const rewriteHost = req.hostname;
        const headers = rewriter.sanitizeHeaders({ ...req.headers }); // shallow copy
        headers['x-real-ip'] = req.ip;
        headers['x-forwarded-for'] = config.trustProxy ? req.ips.join(', ') : req.ip;
        headers['x-forwarded-host'] = rewriteHost;
        if (config.trustProxy && req.headers['x-forwarded-port']) {
            headers['x-forwarded-port'] = req.headers['x-forwarded-port'];
        } else if (!config.trustProxy) {
            headers['x-forwarded-port'] = app.get('port');
        }
        headers['x-forwarded-proto'] = req.protocol;

        const body = typeof req.body === 'string' ? req.body : undefined;

        const outgoingData = {
            host: `${hostname}:${port}`,
            url,
            method: req.method,
            headers,
            query: req.query,
            body
        };

        app.get('gateway').request(rewriteHost, res, outgoingData);
    } else {
        res.status(403).type('text').send(`Forbidden: ${req.method} ${url} is not allowed by policy.`);
    }
});

app.use('/admin', adminRouter);

app.use(function (req, res, next) {
    res.sendStatus(404);
});

app.use(function (err, req, res, next) {
    console.error(err);
    res.sendStatus(500);
});

module.exports = app;
