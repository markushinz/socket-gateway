const config = require('./config');

const socketio = require('socket.io-client');
const request = require('request');

const io = socketio(config.outerLayer, config.tlsOptions);

console.log(`Connecting to outer layer ${config.outerLayer}...`);

io.on('connect', function () {
    console.log('Outer Layer connected.');
});

io.on('request', function (incomingData) {
    delete incomingData.headers['content-type'];

    request({
        method: incomingData.method,
        url: incomingData.url,
        headers: incomingData.headers,
        qs: incomingData.query,
        body: incomingData.body,
        json: typeof incomingData.body === 'object',
        gzip: true,
        followRedirect: false
    }, function (error, response, body) {
        const outgoingData = {
            uuid: incomingData.uuid,
            host: incomingData.host,
            statusCode: error ? 500 : response.statusCode,
            body: error ? { message: 'Internal Server Error' } : body,
            headers: error ? {} : response.headers
        }

        if (error) { console.error(error) };

        io.emit('request', outgoingData);
    });
})

io.on('customPing', function (incomingData) {
    const outgoingData = {
        uuid: incomingData.uuid,
    };
    io.emit('customPing', outgoingData);
});

io.on('disconnect', function () {
    console.log('Outer Layer disconnected.');
});
