const socketio = require('socket.io');
const uuid = require('uuid').v1;

const config = require('./config');
const rewriteTool = require('./tools/rewrite');
const challengeTool = require('./tools/challenge');

const pendingRequests = new Map();
const innerLayers = new Map();

const createGateway = function (server) {
    const io = socketio(server);

    io.use(function (socket, next) {
        const challenge = socket.request.headers['challenge'];
        const challengeResponse = socket.request.headers['challenge-response'];
        if (challengeTool.verifyChallengeResponse(challenge, challengeResponse)) {
            next();
        } else {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', function (socket) {
        innerLayers.set(socket.id, {
            id: socket.id,
            ip: socket.handshake.address,
            latencies: []
        });

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

                incomingData.headers = rewriteTool.sanitizeHeaders(incomingData.headers);
                incomingData.headers = rewriteTool.rewriteObject(incomingData.headers, incomingData.host, pendingRequest.rewriteHost);
                pendingRequest.res.status(incomingData.statusCode).set(incomingData.headers);
                if (incomingData.body) {
                    pendingRequest.res.send(Buffer.from(incomingData.body, 'binary'));
                } else {
                    pendingRequest.res.end();
                }
            }
        });

        socket.on('disconnect', function () {
            innerLayers.delete(socket.id)

            if (innerLayers.size == 0) {
                pendingRequests.forEach(function (pendingRequest) {
                    pendingRequest.res.sendStatus(502);
                });
            }
            pendingRequests.clear();
            console.log(`Inner layer ${socket.id} disconnected.`);
        });
    });

    return {
        request: function (rewriteHost, res, outgoingData) {
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
                const innerLayerIndex = res.req.socket.remotePort % innerLayersArray.length;
                const innerLayerID = innerLayersArray[innerLayerIndex];

                io.to(innerLayerID).emit('request', outgoingData);

                setTimeout(() => {
                    if (pendingRequests.has(pendingRequest.uuid)) {
                        pendingRequests.delete(pendingRequest.uuid);
                        res.sendStatus(504);
                    }
                }, config.timeout);
            } else {
                res.sendStatus(502);
            }
        },
        get innerLayers() {
            return Array.from(innerLayers.values());
        }
    }
}

module.exports = {
    createGateway,
    get innerLayers() {
        return Array.from(innerLayers.values());
    }
};
