const crypto = require('crypto');

const socketio = require('socket.io-client');
const axios = require('axios').default;

const config = require('./config');

const getChallenge = async function (attempt = 0) {
    const challengeURL = new URL('/challenge', config.outerLayer).href
    try {
        const response = await axios.get(challengeURL);
        const challenge = response.data
        console.log(`Got challenge "${challenge}" from ${challengeURL}.`);
        return challenge;
    } catch (error) {
        console.error(`Could not get challenge from ${challengeURL}. Retrying in 1 second...`);
        if (attempt > 5) {
            console.error(error);
        }
        await new Promise(function (resolve) { setTimeout(resolve, attempt * 1000) });
        return getChallenge(attempt ? attempt + 1 : 1);
    }
}

const solveChallenge = function (challenge) {
    const sign = crypto.createSign('SHA256');
    sign.update(challenge);
    sign.end();
    const challengeResponse = sign.sign(config.innerLayerPrivateKey).toString('hex');
    console.log(`Computed challenge response "${challengeResponse}".`);
    return challengeResponse;
}

const getHeaders = async function () {
    const challenge = await getChallenge();
    return {
        'x-challenge': challenge,
        'x-challenge-response': solveChallenge(challenge)
    }
};

const connect = async function () {
    const io = socketio(config.outerLayer, {
        transportOptions: {
            polling: {
                extraHeaders: await getHeaders()
            }
        },
        reconnection: false
    });

    console.log(`Connecting to outer layer ${config.outerLayer}...`);

    io.on('connect', function () {
        console.log(`Outer Layer ${config.outerLayer} connected.`);
    });

    io.on('request', async function (incomingData) {
        try {
            const response = await axios({
                method: incomingData.method,
                url: incomingData.url,
                headers: incomingData.headers,
                params: incomingData.query,
                data: incomingData.body,
                maxRedirects: 0,
                responseType: 'arraybuffer',
                responseEncoding: null,
                validateStatus: null,
            });
            const outgoingData = {
                uuid: incomingData.uuid,
                host: incomingData.host,
                statusCode: response.status,
                body: response.data.toString('binary'),
                headers: response.headers
            }
            io.emit('request', outgoingData);
        } catch (error) {
            console.error(error);
            const outgoingData = {
                uuid: incomingData.uuid,
                host: incomingData.host,
                statusCode: 500,
                body: 'Internal Server Error',
                headers: { 'content-type': 'text/plain' }
            }
            io.emit('request', outgoingData);
        }
    });

    io.on('pong', function (latency) {
        io.emit('latency', latency);
    });

    io.on('disconnect', function () {
        console.log(`Outer Layer ${config.outerLayer} disconnected.`);
        connect(); // reconnect
    });
};

connect();
