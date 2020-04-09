const path = require('path');
const express = require('express');
const router = express.Router();

const config = require('../config');

router.use(express.static(path.join(__dirname, 'static')));

router.get('/', function (req, res, next) {
    const innerLayers = req.app.get('gateway').innerLayers;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <title>Socket Gateway</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" type="text/css" href="/admin/stylesheet.css">
</head>
  
<body>
    <div id="container">
        <h1>Socket Gateway</h1>
        <h3>Inner Layers</h3>
        <pre>${JSON.stringify(innerLayers, null, 4)}</pre>
        <h3>Targets</h3>
        <pre>${JSON.stringify(config.targets, null, 4)}</pre>
    </div>
</body>

</html>`);
});

module.exports = router;