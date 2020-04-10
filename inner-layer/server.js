const crypto = require('crypto');
const https = require('https');

const socketio = require('socket.io-client');
const axios = require('axios');

const config = require('./config');

const getChallenge = function (attempt = 0) {
    const challengeURL = new URL('/challenge', config.outerLayer).href
    return new Promise(function (resolve) {
        axios.get(challengeURL, {
            httpsAgent: new https.Agent(config.tlsOptions)
        }).then(function (response) {
            const challenge = response.data;
            console.log(`Got challenge "${challenge}" from ${challengeURL}.`);
            resolve(challenge);
        }).catch(function (error) {
            attempt = attempt ? attempt + 1 : 1
            if (attempt > 5) {
                console.error(`Could not get challenge from ${challengeURL}. Retrying in ${attempt} seconds...`);
                console.error(error);
            }
            setTimeout(function () {
                resolve(getChallenge(attempt));
            }, attempt * 1000);
        });
    });
}

const solveChallenge = function (challenge) {
    const sign = crypto.createSign('SHA256');
    sign.update(challenge);
    sign.end();
    const challengeResponse = sign.sign(config.innerLayerPrivateKey).toString('hex');
    console.log(`Computed challenge response "${challengeResponse}".`);
    return challengeResponse;
}

getChallenge().then(function (challenge) {
    const challengeResponse = solveChallenge(challenge);

    const io = socketio(config.outerLayer, {
        ...config.tlsOptions,
        transportOptions: {
            polling: {
                extraHeaders: {
                    'x-challenge': challenge,
                    'x-challenge-response': challengeResponse
                }
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
                headers: { 'content-type': 'text/plain' }
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
});
