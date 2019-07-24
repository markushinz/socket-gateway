const config = require('./config');

const socketio = require('socket.io-client');
const request = require('request');

const io = socketio(config.outerLayer, config.tlsOptions);

const sanitizeHeaders = function (headers) {
    delete headers['host'];
    delete headers['accept'];
    delete headers['accept-charset'];
    delete headers['accept-encoding'];
    delete headers['accept-language'];
    delete headers['accept-ranges'];
    delete headers['cache-control'];
    delete headers['content-encoding'];
    delete headers['content-language'];
    delete headers['content-length'];
    delete headers['content-location'];
    delete headers['content-md5'];
    delete headers['content-range'];
    delete headers['content-type'];
    delete headers['connection'];
    delete headers['date'];
    delete headers['expect'];
    delete headers['max-forwards'];
    delete headers['pragma'];
    delete headers['proxy-authorization'];
    delete headers['referer'];
    delete headers['te'];
    delete headers['transfer-encoding'];
    delete headers['user-agent'];
    delete headers['via'];
    return headers;
}

io.on('connect', function () {
    console.log('Outer Layer connected.');
});

io.on('request', function (incomingData) {
    request({
        method: incomingData.method,
        url: incomingData.url,
        headers: sanitizeHeaders(incomingData.headers),
        qs: incomingData.query,
        body: incomingData.body,
        json: typeof incomingData.body === 'object',
        gzip: true
    }, function (error, response, body) {
        const outgoingData = {
            uuid: incomingData.uuid,
            statusCode: error ? 500 : response.statusCode,
            body: error ? { message: 'Internal Server Error' } : body,
            headers: error ? {} : sanitizeHeaders(response.headers)
        }

        if (error) { console.error(error) };

        io.emit('request', outgoingData);
    });
})

io.on('customPing', function (incomingData) {
    const outgoingData = {
        uuid: incomingData.uuid,
    };
    io.emit('customPing', outgoingData);
});

io.on('disconnect', function () {
    console.log('Outer Layer disconnected.');
});
