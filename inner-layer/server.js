const config = require('./config');

const socketio = require('socket.io-client');
const axios = require('axios');

const io = socketio(config.outerLayer, config.tlsOptions);

console.log(`Connecting to outer layer ${config.outerLayer}...`);

io.on('connect', function () {
    console.log('Outer Layer connected.');
});

io.on('request', function (incomingData) {
    axios({
        method: incomingData.method,
        url: incomingData.url,
        headers: incomingData.headers,
        params: incomingData.query,
        data: incomingData.body,
        maxRedirects: 0,
        responseType: 'arraybuffer',
        responseEncoding: null,
        validateStatus: null,
    }).then(function (response) {
        const outgoingData = {
            uuid: incomingData.uuid,
            host: incomingData.host,
            statusCode: response.status,
            body: response.data.toString('binary'),
            headers: response.headers
        }
        io.emit('request', outgoingData);
    }).catch(function (error) {
        console.error(error);
        const outgoingData = {
            uuid: incomingData.uuid,
            host: incomingData.host,
            statusCode: 500,
            body: '{ "message": "Internal Server Error" }',
            headers: { 'Content-Type': 'application/json' }
        }
        io.emit('request', outgoingData);
    });
});

io.on('customPing', function (incomingData) {
    const outgoingData = {
        uuid: incomingData.uuid,
    };
    io.emit('customPing', outgoingData);
});

io.on('disconnect', function () {
    console.log('Outer Layer disconnected.');
});
