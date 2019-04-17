const config = require('./config');

const socketio = require('socket.io-client');
const request = require('request');

const io = socketio(config.outerLayer, config.tlsOptions);

io.on('connect', function () {
    console.log('Outer Layer connected.');
});

io.on('request', function (incomingData) {
    let options = {};
    if (config.certificateAuthorities[incomingData.host]) {
        options.ca = config.certificateAuthorities[incomingData.host];
    }

    request({
        method: incomingData.method,
        url: incomingData.url,
        headers: incomingData.headers,
        qs: incomingData.query,
        body: incomingData.body,
        json: true,
        ...options
    }, function (error, response, body) {
        const outgoingData = {
            uuid: incomingData.uuid,
            statusCode: error ? 500 : response.statusCode,
            body: error ? { message: 'Internal Server Error' } : body
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
