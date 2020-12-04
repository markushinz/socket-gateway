import { createServer } from 'http';
import axios from 'axios';

const ports = {
    appServer: '4000',
    socketServer: '4001',
    testServer: 4002
};

type Test = {
    name: string,
    args: {
        timeout: number,
        statusCode: number,
        body: string
    },
    wantStatusCode?: number
    wantBody?: string
};

const tests: Test[] = [
    {
        name: 'happy path',
        args: {
            timeout: 0,
            statusCode: 200,
            body: 'Hello World!'
        }
    },
    {
        name: 'timeout',
        args: {
            timeout: 2000,
            statusCode: 200,
            body: 'Hello World!'
        },
        wantStatusCode: 504,
        wantBody: 'Gateway Timeout'
    }
];

process.env.SG_APP_PORT = ports.appServer;
process.env.SG_SOCKET_PORT = ports.socketServer;
process.env.SG_TIMEOUT = "1000";
process.env.SG_TARGETS = `targets:
  localhost:
    protocol: http
    hostname: localhost
    port: ${ports.testServer}
`;

import { appServer, socketServer, client } from './server';

tests.forEach(function (tt) {
    test(tt.name, async function () {
        const testServer = createServer(async function (req, res) {
            await new Promise(r => setTimeout(r, tt.args.timeout));
            res.setHeader('content-type', 'text/plain');
            res.statusCode = tt.args.statusCode;
            res.end(tt.args.body);
        });
        testServer.listen(ports.testServer, 'localhost');
        await new Promise(r => setTimeout(r, 1000));
        const response = await axios.get(`http://localhost:${ports.appServer}`, { validateStatus: undefined });

        expect(response.status).toStrictEqual(tt.wantStatusCode ?? tt.args.statusCode);
        expect(response.data).toStrictEqual(tt.wantBody ?? tt.args.body);

        testServer.close();
    });
});

afterAll(async function () {
    appServer.close();
    socketServer.close();
    (await client).close();
    await new Promise(r => setTimeout(r, 1000));
});
