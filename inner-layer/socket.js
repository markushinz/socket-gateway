const config = require('./config');

const socketio = require('socket.io-client');

const io = socketio(config.outerLayer);

io.on('connect', function () {
    console.log('connected');
});

io.on('disconnect', function () {
    console.log('disconnected');
});
