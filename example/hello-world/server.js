const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', function (req, res, next) {
    res.send('Hello World!');
});

app.listen(port, function () {
    console.log(`Listening on port ${port}...`);
});
