import { createServer } from 'http';
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

process.env.SG_APP_PORT = ports.appServer;
process.env.SG_SOCKET_PORT = ports.socketServer;
process.env.SG_TARGETS = `targets:
  localhost:
    protocol: http
    hostname: localhost
    port: ${ports.testServer}
`;

import { appServer, socketServer, client } from './server';

test('e2e', async function () {
    await new Promise(r => setTimeout(r, 1000));
    const response = await axios.get(`http://localhost:${ports.appServer}`);
    expect(response.status).toStrictEqual(200);
    expect(response.data).toStrictEqual('Hello World');
    appServer.close();
    socketServer.close();
    testServer.close();
    (await client).close();
    await new Promise(r => setTimeout(r, 1000));
});
