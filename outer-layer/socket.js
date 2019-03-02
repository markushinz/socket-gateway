const socketio = require('socket.io');

module.exports = function (server) {
    const io = socketio(server);

    io.on('connection', function (socket) {
        console.log('connected');
        socket.on('disconnect', function () {
            console.log('disconnected');
        });
    });
}
