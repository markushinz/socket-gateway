import { createServer } from 'http'
import axios from 'axios'

import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

type Test = {
    name: string,
    args: {
        timeout: number,
        statusCode: number,
        body: string
    },
    wantStatusCode?: number
    wantBody?: string
}

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
            timeout: 4000,
            statusCode: 200,
            body: 'Hello World!'
        },
        wantStatusCode: 504,
        wantBody: 'Gateway Timeout'
    }
]

import { cli } from './cli'
import { Closeable } from './models'
const closeables: Closeable[] = []

const directory = mkdtempSync(join(tmpdir(), 'socket-gateway-'))
beforeAll(async function() {
    writeFileSync(join(directory,'targets.yaml'), `targets:
  "e2e":
    protocol: "http"
    hostname: "localhost"
    port: 4002
`)
    closeables.push(await cli(['certificates', '--private-key', join(directory,'innerLayer.key'),  '--public-key', join(directory,'innerLayer.crt')]))
    closeables.push(await cli(['inner-layer', '--outer-layer', 'ws://localhost:4001', '--private-key', join(directory,'innerLayer.key')]))
    closeables.push(await cli(['outer-layer', '--app-port', '4000', '--socket-port', '4001', '--timeout', '2000', '--targets', join(directory,'targets.yaml'), '--public-key', join(directory,'innerLayer.crt')]))
})

tests.forEach(function (tt) {
    test(tt.name, async function () {
        const testServer = createServer(async function (req, res) {
            await new Promise(r => setTimeout(r, tt.args.timeout))
            res.setHeader('content-type', 'text/plain')
            res.statusCode = tt.args.statusCode
            res.end(tt.args.body)
        })
        testServer.listen(4002, 'localhost')
        await new Promise(r => setTimeout(r, 2000))
        const response = await axios.get('http://localhost:4000', { validateStatus: undefined, headers: { host: 'e2e' } })

        expect(response.status).toStrictEqual(tt.wantStatusCode ?? tt.args.statusCode)
        expect(response.data).toStrictEqual(tt.wantBody ?? tt.args.body)

        testServer.close()
    })
})

afterAll(async function () {
    closeables.forEach(server => server.close())
    await new Promise(r => setTimeout(r, 1000))
    rmSync(directory, { recursive: true, force: true })
})
