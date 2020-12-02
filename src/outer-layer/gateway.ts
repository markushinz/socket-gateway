import { Server } from 'socket.io';
import { v1 as uuid } from 'uuid';

import Config from './config';
import { verifyChallengeResponse } from './tools/challenge';
import { sanitizeHeaders, rewriteObject } from './tools/rewrite';

import { Server as HTTPServer } from 'http';
import { Response } from 'express';

type InnerLayer = {
    id: string,
    ip: string,
    timestamp: string,
    headers: unknown,
    latencies: number[]
};

type IncomingData = {
    uuid: string,
    headers: Record<string, string | string[]>,
    host: string,
    statusCode: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any
};

export class Gateway {
    io: Server;
    pendingRequests = new Map();
    innerLayersMap = new Map();

    constructor(server: HTTPServer) {
        this.io = new Server(server);

        this.io.use(function (socket, next) {
            const headers = socket.handshake.headers as Record<string, string>;
            const challenge = headers['x-challenge'];
            const challengeResponse = headers['x-challenge-response'];

            if (!!challenge &&
                !!challengeResponse &&
                verifyChallengeResponse(challenge, challengeResponse)) {
                next();
            } else {
                next(new Error('Inner Layer did not present a valid challenge / challenge reponse pair.'));
            }
        });

        this.io.on('connection', (socket) => {
            const innerLayer: InnerLayer = {
                id: socket.id,
                ip: socket.handshake.address,
                timestamp: new Date().toUTCString(),
                headers: socket.handshake.headers,
                latencies: []
            };
            this.innerLayersMap.set(socket.id, innerLayer);

            console.log(`Inner layer ${socket.id} connected.`);

            socket.on('latency', (latency: number) => {
                const latencies = this.innerLayersMap.get(socket.id).latencies;
                latencies.unshift(`${latency} ms`);
                if (latencies.length > 10) {
                    latencies.pop();
                }
            });

            socket.on('request', (incomingData: IncomingData) => {
                const pendingRequest = this.pendingRequests.get(incomingData.uuid);
                if (pendingRequest) {
                    this.pendingRequests.delete(incomingData.uuid);

                    incomingData.headers = sanitizeHeaders(incomingData.headers);
                    rewriteObject(incomingData.headers, incomingData.host, pendingRequest.rewriteHost);
                    pendingRequest.res.status(incomingData.statusCode).set(incomingData.headers);
                    if (incomingData.body) {
                        pendingRequest.res.send(Buffer.from(incomingData.body, 'binary'));
                    } else {
                        pendingRequest.res.end();
                    }
                }
            });

            socket.on('disconnect', () => {
                this.innerLayersMap.delete(socket.id);

                if (this.innerLayersMap.size == 0) {
                    this.pendingRequests.forEach(pendingRequest => {
                        pendingRequest.res.sendStatus(502);
                    });
                    this.pendingRequests.clear();
                }
                console.log(`Inner layer ${socket.id} disconnected.`);
            });
        });
    }

    request(rewriteHost: string, res: Response<unknown>, outgoingData: Record<string, unknown>): void {
        if (this.innerLayersMap.size > 0) {
            const pendingRequest = {
                uuid: uuid(),
                rewriteHost,
                res
            };

            this.pendingRequests.set(pendingRequest.uuid, pendingRequest);

            outgoingData.uuid = pendingRequest.uuid;

            // Do reproducable scheduling depeing on the remotePort. This will make sure that all requests
            // of one TCP connection get routed to the same inner layer.
            // This does not garantuee any fair scheduling.
            const innerLayersArray = Array.from(this.innerLayersMap.keys());
            const innerLayerIndex = (res.req?.socket.remotePort ?? 0) % innerLayersArray.length;
            const innerLayerID = innerLayersArray[innerLayerIndex];

            this.io.to(innerLayerID).emit('request', outgoingData);

            setTimeout(() => {
                if (this.pendingRequests.has(pendingRequest.uuid)) {
                    this.pendingRequests.delete(pendingRequest.uuid);
                    res.sendStatus(504);
                }
            }, Config.timeout);
        } else {
            res.sendStatus(502);
        }
    }

    get innerLayers(): InnerLayer[] {
        return Array.from(this.innerLayersMap.values());
    }
}
