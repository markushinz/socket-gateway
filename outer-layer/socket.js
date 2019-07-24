const config = require('./config');

const socketio = require('socket.io');
const uuid = require('uuid/v1');

const pendingRequests = {};

const innerLayers = new Set();
var innerLayerScheduler = 0;

module.exports.createGateway = function (server) {
    const io = socketio(server);

    io.on('connection', function (socket) {
        innerLayers.add(socket.id);
        console.log(`Inner layer ${socket.id} connected.`);

        socket.on('customPing', function (incomingData) {
            const end = new Date().getTime();

            const pendingRequest = pendingRequests[incomingData.uuid];
            if (pendingRequest) {
                delete pendingRequests[pendingRequest.uuid];

                const outgoingData = {
                    'rtt': (end - pendingRequest.start) + "ms"
                }

                pendingRequest.res.json(outgoingData);
            }
        });

        socket.on('request', function (incomingData) {
            const pendingRequest = pendingRequests[incomingData.uuid];
            if (pendingRequest) {
                delete pendingRequests[pendingRequest.uuid];
                pendingRequest.res.status(incomingData.statusCode).set(incomingData.headers);
                if (typeof incomingData.body === 'object') {
                    pendingRequest.res.json(incomingData.body);
                } else {
                    pendingRequest.res.send(incomingData.body);
                }
            }
        });

        socket.on('disconnect', function () {
            Object.keys(pendingRequests).forEach(function (uuid) {
                pendingRequests[uuid].res.status(502).json({ message: 'Bad Gateway' });
            });

            innerLayers.delete(socket.id)
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

            pendingRequests[pendingRequest.uuid] = pendingRequest;

            outgoingData.uuid = pendingRequest.uuid;

            innerLayersArray = Array.from(innerLayers);
            innerLayerScheduler = (innerLayerScheduler + 1) % innerLayersArray.length; 
            io.to(innerLayersArray[innerLayerScheduler]).emit(event, outgoingData);

            setInterval(() => {
                if (pendingRequests[pendingRequest.uuid]) {
                    delete pendingRequests[pendingRequest.uuid];
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
