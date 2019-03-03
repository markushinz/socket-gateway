const socketio = require('socket.io');
const uuid = require('uuid/v1');

const pendingRequests = {};

module.exports.createGateway = function (server) {
    const io = socketio(server);

    io.on('connection', function (socket) {
        console.log('Inner layer connected.');

        socket.on('request', function (incomingData) {
            // console.log('incoming data: ', incomingData);

            const pendingRequest = pendingRequests[incomingData.uuid];
            delete pendingRequests[pendingRequest.uuid];

            pendingRequest.res.status(incomingData.statusCode).json(incomingData.body);
        });

        socket.on('disconnect', function () {

            Object.keys(pendingRequests).forEach(function (uuid) {
                pendingRequests[uuid].res.status(500).json({ message: 'Internal Server Error' });
            });

            console.log('Inner Layer disconnected.');
        });
    });

    return function (req, res) {
        const pendingRequest = {
            uuid: uuid(),
            req,
            res
        };

        pendingRequests[pendingRequest.uuid] = pendingRequest;

        const outgoingData = {
            uuid: pendingRequest.uuid,
            host: req.body.host,
            url: req.body.url,
            method: req.body.method,
            headers: req.body.headers,
            query: req.body.query,
            body: req.body.body,
        };

        // console.log('outgoing data: ', outgoingData);

        io.emit('request', outgoingData)
    };
}
