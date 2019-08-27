const config = require('./config');

const socketio = require('socket.io-client');
const request = require('request');
const axios = require('axios');

const io = socketio(config.outerLayer, config.tlsOptions);

console.log(`Connecting to outer layer ${config.outerLayer}...`);

io.on('connect', function () {
    console.log('Outer Layer connected.');
});

io.on('request', function (incomingData) {
    try {
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
            const outgoingData = {
                uuid: incomingData.uuid,
                host: incomingData.host,
                statusCode: 500,
                body: '{ "message": "Internal Server Error" }',
                headers: { 'Content-Type': 'application/json' }
            }

            console.error(error);

            io.emit('request', outgoingData);
        });

        // request({
        //     method: incomingData.method,
        //     url: incomingData.url,
        //     headers: incomingData.headers,
        //     qs: incomingData.query,
        //     body: incomingData.body,
        //     gzip: true,
        //     followRedirect: false,
        //     encoding: null
        // }, function (error, response, body) {
        //     if (body) {
        //         body = body.toString('binary');
        //     }

        //     const outgoingData = {
        //         uuid: incomingData.uuid,
        //         host: incomingData.host,
        //         statusCode: error ? 500 : response.statusCode,
        //         body: error ? '{ "message": "Internal Server Error" }' : body,
        //         headers: error ? { 'Content-Type': 'application/json' } : response.headers
        //     }

        //     if (error) { console.error(error) };

        //     io.emit('request', outgoingData);
        // });
    } catch (error) {
        console.error(error);
    }
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
