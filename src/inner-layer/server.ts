import crypto from 'crypto';

import socketio from 'socket.io-client';
import { default as axios, AxiosRequestConfig } from 'axios';

import Config from '../config';

const getChallenge = async function (attempt = 0): Promise<string> {
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
};

const solveChallenge = function (challenge: string) {
    const sign = crypto.createSign('SHA256');
    sign.update(challenge);
    sign.end();
    const challengeResponse = sign.sign(Config.privateKey).toString('hex');
    console.log(`Computed challenge response "${challengeResponse}".`);
    return challengeResponse;
};

const getHeaders = async function () {
    const challenge = await getChallenge();
    return {
        'x-inner-layer-identifier': Config.innerLayerIdentifier,
        'x-challenge': challenge,
        'x-challenge-response': solveChallenge(challenge)
    };
};

interface IncomingData {
    method: AxiosRequestConfig["method"],
    url: AxiosRequestConfig["url"],
    headers: AxiosRequestConfig["headers"],
    query: AxiosRequestConfig["params"],
    body: AxiosRequestConfig["data"],
    uuid: string,
    host: string
}


const connect = async function () {
    const outerLayer = Config.outerLayer;
    const io = socketio(outerLayer, {
        transportOptions: {
            polling: {
                extraHeaders: await getHeaders()
            }
        },
        reconnection: false
    });

    console.log(`Connecting to outer layer ${outerLayer}...`);

    io.on('connect', function () {
        console.log(`Outer Layer ${outerLayer} connected.`);
    });

    io.on('request', async function (incomingData: IncomingData) {
        try {
            const response = await axios({
                method: incomingData.method,
                url: incomingData.url,
                headers: incomingData.headers,
                params: incomingData.query,
                data: incomingData.body,
                maxRedirects: 0,
                responseType: 'arraybuffer', // as AxiosRequestConfig["responseType"]
                // responseEncoding: null,
                validateStatus: null,
            });
            const outgoingData = {
                uuid: incomingData.uuid,
                host: incomingData.host,
                statusCode: response.status,
                body: response.data.toString('binary'),
                headers: response.headers
            };
            io.emit('request', outgoingData);
        } catch (error) {
            console.error(error);
            const outgoingData = {
                uuid: incomingData.uuid,
                host: incomingData.host,
                statusCode: 500,
                body: 'Internal Server Error',
                headers: { 'content-type': 'text/plain' }
            };
            io.emit('request', outgoingData);
        }
    });

    io.on('pong', function (latency: number) {
        io.emit('latency', latency);
    });

    io.on('disconnect', function (reason: string) {
        console.log(`Outer Layer ${outerLayer} disconnected.`);
        if (reason !== 'io client disconnect') {
            connect(); // reconnect
        }
    });

    return io;
};

export const handler = connect();
