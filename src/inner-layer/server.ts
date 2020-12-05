import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { sign } from 'jsonwebtoken';

import { Data, JWTPayload } from '../models';
import Config from './config';

class Client {
    private reconnect: boolean;
    private socket: Promise<Socket>;

    constructor() {
        this.reconnect = true;
        this.socket = this.connect();
    }

    private async getChallenge(attempt = 0): Promise<string> {
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
            return this.getChallenge(attempt ? attempt + 1 : 1);
        }
    }

    private solveChallenge(challenge: string) {
        const payload: JWTPayload = { challenge, identifier: Config.innerLayerIdentifier };
        const challengeResponse = sign(payload, Config.privateKey, { algorithm: 'RS256', expiresIn: 2 });
        return challengeResponse;
    }

    private async getHeaders() {
        const challenge = await this.getChallenge();
        return {
            'x-challenge-response': this.solveChallenge(challenge),
        };
    }

    private async connect() {
        const outerLayer = Config.outerLayer;
        const socket = io(outerLayer, {
            transportOptions: {
                polling: {
                    extraHeaders: await this.getHeaders()
                }
            },
            reconnection: false
        });

        console.log(`Connecting to outer layer ${outerLayer}...`);

        socket.on('connect', () => {
            console.log(`Outer Layer ${outerLayer} connected.`);
        });

        socket.on('request', async (incomingData: Data) => {
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

        socket.on('disconnect', () => {
            console.log(`Outer Layer ${outerLayer} disconnected.`);
            if (this.reconnect) {
                this.socket = this.connect();
            }
        });

        return socket;
    }

    async close() {
        this.reconnect = false;
        (await this.socket).close();
    }
}

export const client = new Client();
