const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const evaluateTool = require('./tools/evaluate');
const rewriteTool = require('./tools/rewrite');
const defaultRouter = require('./routers/default');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(compression());
app.use(express.text({ type: '*/*' }));
app.use(cookieParser());

app.use(function (req, res, next) {
    const target = evaluateTool.getTarget(req.hostname.split(':')[0]);
    if (!target) {
        return next();
    }
    const protocol = target.protocol || 'https';
    const hostname = target.hostname;
    const port = target.port || (protocol === 'http' ? 80 : 443);
    const url = protocol + '://' + hostname + ":" + port + req.path;

    const policy = target.policy || { '*': '*' };

    if (evaluateTool.evaluatePolicy(policy, req.path, req.method)) {
        const rewriteHost = req.hostname;
        const headers = rewriteTool.sanitizeHeaders({ ...req.headers }); // shallow copy
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

app.use(defaultRouter);

module.exports = app;
