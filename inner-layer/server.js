const config = require('./config');

const socketio = require('socket.io-client');
const request = require('request');

const io = socketio(config.outerLayer, config.sslOptions);

io.on('connect', function () {
    console.log('Outer Layer connected.');
});

io.on('request', function (incomingData) {
    //console.log('incoming data: ', incomingData);

    let options = {};
    if (config.cas[incomingData.host]) {
        options.ca = config.cas[incomingData.host];
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
        // console.log('outgoing data: ', outgoingData);

        io.emit('request', outgoingData);
    });
})

io.on('disconnect', function () {
    console.log('Outer Layer disconnected.');
});
