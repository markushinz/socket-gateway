const config = require('./config');

const rewriter = require('./rewriter');

const socketio = require('socket.io');
const uuid = require('uuid/v1');

const pendingRequests = new Map();
const innerLayers = new Map();

module.exports.createGateway = function (server) {
    const io = socketio(server);

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
                    pendingRequest.res.status(502).json({ message: 'Bad Gateway' });
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
    
                setInterval(() => {
                    if (pendingRequests.has(pendingRequest.uuid)) {
                        pendingRequests.delete(pendingRequest.uuid);
                        res.status(504).json({
                            message: 'Gateway Timeout'
                        });
                    }
                }, config.timeout);
            } else {
                res.status(502).json({ message: 'Bad Gateway' });
            }
        },
        get innerLayers() {
            return Array.from(innerLayers.values());
        }
    }
}
