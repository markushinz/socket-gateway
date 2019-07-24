const config = require('./config');

const socketio = require('socket.io');
const uuid = require('uuid/v1');

const pendingRequests = new Map();

const innerLayers = new Set();
var innerLayerScheduler = 0;

module.exports.createGateway = function (server) {
    const io = socketio(server);

    io.on('connection', function (socket) {
        innerLayers.add(socket.id);
        console.log(`Inner layer ${socket.id} connected.`);

        socket.on('customPing', function (incomingData) {
            const end = new Date().getTime();

            const pendingRequest = pendingRequests.get(incomingData.uuid);
            if (pendingRequest) {
                pendingRequests.delete(incomingData.uuid);

                const outgoingData = {
                    'rtt': (end - pendingRequest.start) + "ms"
                }

                pendingRequest.res.json(outgoingData);
            }
        });

        socket.on('request', function (incomingData) {
            const pendingRequest = pendingRequests.get(incomingData.uuid);
            if (pendingRequest) {
                pendingRequests.delete(incomingData.uuid);
                pendingRequest.res.status(incomingData.statusCode).set(incomingData.headers);
                if (typeof incomingData.body === 'object') {
                    pendingRequest.res.json(incomingData.body);
                } else {
                    pendingRequest.res.send(incomingData.body);
                }
            }
        });

        socket.on('disconnect', function () {
            innerLayers.delete(socket.id)

            if (innerLayers.size == 0) {
                pendingRequests.values.forEach(function (pendingRequest) {
                    pendingRequest.res.status(502).json({ message: 'Bad Gateway' });
                });
            }
            console.log(`Inner layer ${socket.id} disconnected.`);
        });
    });

    return function (event, req, res, outgoingData) {
        if (innerLayers.size > 0) {
            const pendingRequest = {
                uuid: uuid(),
                start: new Date().getTime(),
                req,
                res
            };

            pendingRequests.set(pendingRequest.uuid, pendingRequest);

            outgoingData.uuid = pendingRequest.uuid;

            innerLayersArray = Array.from(innerLayers);
            innerLayerScheduler = (innerLayerScheduler + 1) % innerLayersArray.length;
            io.to(innerLayersArray[innerLayerScheduler]).emit(event, outgoingData);

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
    };
}
