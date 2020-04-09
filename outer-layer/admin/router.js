const express = require('express');
const router = express.Router();

const config = require('../config');

router.get('/', function (req, res, next) {
    if (config.adminCredentials) {
        if (req.headers.authorization === `Basic ${config.adminCredentials}`) {
            const innerLayers = app.get('gateway').innerLayers;
            res.setHeader('content-type', 'text/html; charset=utf-8');
            res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <title>Socket Gateway</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
  
<body>
    <h1>Socket Gateway</h1>
    <h3>Inner Layers</h3>
    <pre>${JSON.stringify(innerLayers, null, 4)}</pre>
    <h3>Targets</h3>
    <pre>${JSON.stringify(config.targets, null, 4)}</pre>
</body>

</html>`);
        } else {
            res.setHeader('www-authenticate', 'Basic realm="Socket Gateway"');
            res.sendStatus(401);
        }
    } else {
        next();
    }
});

module.exports = router;