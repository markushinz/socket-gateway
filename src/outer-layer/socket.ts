import socketio from 'socket.io';
import { v1 as uuid } from 'uuid';

import { timeout } from './config';
import { verifyChallengeResponse } from './tools/challenge';
import { sanitizeHeaders, rewriteObject } from './tools/rewrite';

import { Server } from 'http';
import { Response } from 'express';

const pendingRequests = new Map();
const innerLayers = new Map();

type GatewayReturn = {
    request: (rewriteHost: string, res: Response<unknown>, outgoingData: Record<string, unknown>) => void,
};

interface InnerLayer {
    id: string,
    ip: string,
    timestamp: string,
    headers: unknown,
    latencies: number[]
}

export function createGateway(server: Server): GatewayReturn {
    const io = socketio(server);

    io.use(function (socket, next) {
        const challenge = socket.handshake.headers['x-challenge'];
        const challengeResponse = socket.handshake.headers['x-challenge-response'];

        if (!!challenge &&
            !!challengeResponse &&
            verifyChallengeResponse(challenge, challengeResponse)) {
            next();
        } else {
            next(new Error('Inner Layer did not present a valid challenge / challenge reponse pair.'));
        }
    });

    io.on('connection', function (socket) {
        const innerLayer: InnerLayer = {
            id: socket.id,
            ip: socket.handshake.address,
            timestamp: new Date().toUTCString(),
            headers: socket.handshake.headers,
            latencies: []
        };
        innerLayers.set(socket.id, innerLayer);

        console.log(`Inner layer ${socket.id} connected.`);

        socket.on('latency', function (latency) {
            const latencies = innerLayers.get(socket.id).latencies;
            latencies.unshift(`${latency} ms`);
            if (latencies.length > 10) {
                latencies.pop();
            }
        });

        socket.on('request', function (incomingData) {
            const pendingRequest = pendingRequests.get(incomingData.uuid);
            if (pendingRequest) {
                pendingRequests.delete(incomingData.uuid);

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

        socket.on('disconnect', function () {
            innerLayers.delete(socket.id);

            if (innerLayers.size == 0) {
                pendingRequests.forEach(function (pendingRequest) {
                    pendingRequest.res.sendStatus(502);
                });
                pendingRequests.clear();
            }
            console.log(`Inner layer ${socket.id} disconnected.`);
        });
    });

    return {
        request: function (rewriteHost: string, res: Response<unknown>, outgoingData: Record<string, unknown>) {
            if (innerLayers.size > 0) {
                const pendingRequest = {
                    uuid: uuid(),
                    rewriteHost,
                    res
                };

                pendingRequests.set(pendingRequest.uuid, pendingRequest);

                outgoingData.uuid = pendingRequest.uuid;

                // Do reproducable scheduling depeing on the remotePort. This will make sure that all requests
                // of one TCP connection get routed to the same inner layer.
                // This does not garantuee any fair scheduling.
                const innerLayersArray = Array.from(innerLayers.keys());
                const innerLayerIndex = (res.req?.socket.remotePort ?? 0) % innerLayersArray.length;
                const innerLayerID = innerLayersArray[innerLayerIndex];

                io.to(innerLayerID).emit('request', outgoingData);

                setTimeout(() => {
                    if (pendingRequests.has(pendingRequest.uuid)) {
                        pendingRequests.delete(pendingRequest.uuid);
                        res.sendStatus(504);
                    }
                }, timeout);
            } else {
                res.sendStatus(502);
            }
        }
    };
}

export function getInnerLayers(): InnerLayer[] {
    return Array.from(innerLayers.values());
}
