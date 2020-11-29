import { createServer } from 'http';
import { pki } from 'node-forge';
import axios from 'axios';

const ports = {
    appServer: '4000',
    socketServer: '4001',
    testServer: 4002
};

const testServer = createServer(function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World');
});
testServer.listen(ports.testServer, 'localhost');

const keys = pki.rsa.generateKeyPair({ bits: 4096 });

process.env.NODE_ENV = 'development';
process.env.SG_APP_PORT = ports.appServer;
process.env.SG_SOCKET_PORT = ports.socketServer;
process.env.SG_INNER_LAYER_PUBLIC_KEY = pki.publicKeyToPem(keys.publicKey);
process.env.SG_INNER_LAYER_PRIVATE_KEY = pki.privateKeyToPem(keys.privateKey);
process.env.SG_TARGETS = `targets:
  localhost:
    protocol: http
    hostname: localhost
    port: ${ports.testServer}
`;

import { appServer, socketServer } from './outer-layer/server';
import { handler } from './inner-layer/server';

test('e2e', async function () {
    await new Promise(r => setTimeout(r, 1000));
    const response = await axios.get(`http://localhost:${ports.appServer}`);
    expect(response.data).toStrictEqual('Hello World');
    appServer.close();
    socketServer.close();
    (await handler).disconnect();
    testServer.close();
    await new Promise(r => setTimeout(r, 1000));
});
