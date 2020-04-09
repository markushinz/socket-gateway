const process = require('process');
const crypto = require('crypto');
const config = require('./config');

const socketio = require('socket.io-client');
const axios = require('axios');

setTimeout(() => {
    axios.get(config.outerLayer + '/challenge').then(function (response) {
        const challenge = response.data;
        const sign = crypto.createSign('SHA256');
        sign.update(challenge);
        sign.end();
        const challengeResponse = sign.sign(config.innerLayerPrivateKey).toString('hex');

        const headers = {
            'challenge': challenge,
            'challenge-response': challengeResponse
        }

        // console.log(headers);

        const io = socketio(config.outerLayer, {
            ...config.tlsOptions,
            transportOptions: {
                polling: {
                    extraHeaders: headers
                }
            }
        });
        
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
                    body: 'Internal Server Error',
                    headers: { 'Content-Type': 'text/plain' }
                }
                io.emit('request', outgoingData);
            });
        });
        
        io.on('pong', function (latency) {
            io.emit('latency', latency);
        });
        
        io.on('disconnect', function () {
            console.log('Outer Layer disconnected.');
        });        
    }).catch(function (error) {
        console.log(error);
        process.exit(1);
    });
}, 1000);
