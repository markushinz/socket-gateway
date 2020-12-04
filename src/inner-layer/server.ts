import { createSign } from 'crypto';

import { io } from 'socket.io-client';
import axios from 'axios';

import { Data } from '../models';
import Config from './config';

async function getChallenge(attempt = 0): Promise<string> {
    const challengeURL = new URL('/challenge', Config.outerLayer).href;
    try {
        const response = await axios.get(challengeURL);
        const challenge = response.data;
        console.log(`Got challenge "${challenge}" from ${challengeURL}.`);
        return challenge;
    } catch (error) {
        console.error(`Could not get challenge from ${challengeURL}. Retrying in 1 second...`);
        if (attempt > 5) {
            console.error(error);
        }
        await new Promise(function (resolve) { setTimeout(resolve, attempt * 1000); });
        return getChallenge(attempt ? attempt + 1 : 1);
    }
}

function solveChallenge(challenge: string) {
    const sign = createSign('SHA256');
    sign.update(challenge);
    sign.end();
    const challengeResponse = sign.sign(Config.privateKey).toString('hex');
    console.log(`Computed challenge response "${challengeResponse}".`);
    return challengeResponse;
}

async function getHeaders() {
    const challenge = await getChallenge();
    return {
        'x-inner-layer-identifier': Config.innerLayerIdentifier,
        'x-challenge': challenge,
        'x-challenge-response': solveChallenge(challenge)
    };
}

async function connect() {
    const outerLayer = Config.outerLayer;
    const socket = io(outerLayer, {
        transportOptions: {
            polling: {
                extraHeaders: await getHeaders()
            }
        },
        reconnection: false
    });

    console.log(`Connecting to outer layer ${outerLayer}...`);

    socket.on('connect', function () {
        console.log(`Outer Layer ${outerLayer} connected.`);
    });

    socket.on('request', async function (incomingData: Data) {
        try {
            const response = await axios({
                method: incomingData.method,
                url: incomingData.url,
                headers: incomingData.headers,
                params: incomingData.query,
                data: incomingData.body,
                maxRedirects: 0,
                responseType: 'arraybuffer',
                validateStatus: null,
            });
            const outgoingData = {
                uuid: incomingData.uuid,
                host: incomingData.host,
                statusCode: response.status,
                body: response.data.toString('binary'),
                headers: response.headers
            };
            socket.emit('request', outgoingData);
        } catch (error) {
            console.error(error);
            const outgoingData = {
                uuid: incomingData.uuid,
                host: incomingData.host,
                statusCode: 500,
                body: 'Internal Server Error',
                headers: { 'content-type': 'text/plain' }
            };
            socket.emit('request', outgoingData);
        }
    });

    socket.on('pong', function (latency: number) {
        socket.emit('latency', latency);
    });

    socket.on('disconnect', function (reason: string) {
        console.log(`Outer Layer ${outerLayer} disconnected.`);
        if (reason !== 'io client disconnect') {
            connect(); // reconnect
        }
    });

    return socket;
}

export const client = connect();
