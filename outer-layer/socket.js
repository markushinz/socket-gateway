const crypto = require('crypto');
const url = require('url');

const config = require('./config');

const rewriter = require('./rewriter');

const socketio = require('socket.io');
const uuid = require('uuid/v1');

const pendingChallenges = new Map();

const pendingRequests = new Map();
const innerLayers = new Map();

const challengeCreator = function (req, res) {
    res.setHeader('content-Type', 'text/plain');
    if (req.method === 'GET' && url.parse(req.url).pathname === '/challenge') {
        setTimeout(() => {
            crypto.randomBytes(256, (error, buffer) => {
                if (error) {
                    console.error(error);
                    res.statusCode = 500;
                    res.setHeader('content-Type', 'text/plain');
                    res.end('Internal Server Error');
                } else {
                    const challenge = buffer.toString('hex');
                    pendingChallenges.set(challenge, Date.now());
                    setTimeout(() => {
                        if (pendingChallenges.has(challenge)) {
                            pendingChallenges.delete(challenge);
                        }
                    }, 5000);
                    res.statusCode = 200;
                    res.end(challenge);
                }
            })
        }, 1000);
    } else {
        res.statusCode = 404;
        return res.end('Not Found');
    }
}

const createGateway = function (server) {
    const io = socketio(server);

    io.use(function (socket, next) {
        const challenge = socket.request.headers['challenge'];
        const challengeResponse = Buffer.from(socket.request.headers['challenge-response'], 'hex');
        if (pendingChallenges.has(challenge)) {
            pendingChallenges.delete(challenge);
            const verify = crypto.createVerify('SHA256');
            verify.update(challenge);
            verify.end();
            const ok = verify.verify(config.innerLayerPublicKey, challengeResponse);
            if (ok) {
                return next();
            }
        }
        next(new Error('Authentication error'));
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

                incomingData.headers = rewriter.sanitizeHeaders(incomingData.headers);
                incomingData.headers = rewriter.rewriteObject(incomingData.headers, incomingData.host, pendingRequest.rewriteHost);
                pendingRequest.res.status(incomingData.statusCode).set(incomingData.headers);
                if (incomingData.body) {
                    // incomingData.body = rewriter.rewriteString(incomingData.body, incomingData.host, pendingRequest.rewriteHost);
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
    challengeCreator,
    createGateway
};
