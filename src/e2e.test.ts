import { createServer } from 'http'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { request } from './request'

import { cli } from './cli'
import { Closeable, Target, Headers } from './models'
import { sendStatus } from './helpers'

const directory = mkdtempSync(join(tmpdir(), 'socket-gateway-'))
const config = {
    appPort: '4000',
    socketPort: '4001',
    serverPort: 4002,
    timeout: '500',
    adminPassword: 'admin',
    privateKey: join(directory, 'innerLayer.key'),
    certificate: join(directory, 'innerLayer.crt'),
    targets: join(directory, 'targets.yaml')
}
const adminCredentials = Buffer.from(`admin:${config.adminPassword}`).toString('base64')
writeFileSync(join(directory, 'targets.yaml'), JSON.stringify({
    targets: {
        withoutPolicy: {
            protocol: 'http',
            hostname: 'localhost',
            port: config.serverPort
        },
        withPolicy: {
            protocol: 'http',
            hostname: 'localhost',
            port: config.serverPort,
            policy: {
                '/allowed': '*',
                '^/regexAllowed': '*'
            }
        },
        error: {
            hostname: 'error'
        },
        withIdentifier: {
            protocol: 'http',
            hostname: 'localhost',
            port: config.serverPort,
            identifier: 'identifier'
        },
        withUnknownIdentifier: {
            protocol: 'http',
            hostname: 'localhost',
            port: config.serverPort,
            identifier: 'unknown'
        }
    } as Record<string, Target>
}))

const closeables: Closeable[] = []
beforeAll(async function() {
    console.log(config)
    closeables.push(await cli(['certificates', '--private-key', config.privateKey,  '--certificate', config.certificate]))
    closeables.push(await cli(['inner-layer', '--outer-layer', `ws://localhost:${config.socketPort}`, '--inner-layer-private-key', config.privateKey, '--inner-layer-identifier', 'identifier']))
    closeables.push(await cli(['outer-layer', '--app-port', config.appPort, '--socket-port', config.socketPort, '--timeout', config.timeout, '--targets', config.targets, '--inner-layer-certificate', config.certificate, '--admin-password', config.adminPassword]))
})

afterAll(async function() {
    closeables.forEach(closbale => closbale.close())
    rmSync(directory, { recursive: true, force: true })
})

type Test = {
    name: string;
    args: {
        req: {
            method?: string;
            port?: number;
            host: string;
            path?: string;
            headers?: Headers;
            body?: string | string[];
        };
        timeout?: number;
        statusCode?: number;
        resBody?: string | string[];
    };
    wantStatusCode?: number;
    wantBody?: string | string[];
    wantBodyToContain?: boolean;
}

const tests: Test[] = [
    {
        name: 'withoutPolicy - allowed',
        args: {
            req: {
                host: 'withoutPolicy'
            },
            resBody: 'OK'
        }
    },
    {
        name: 'withoutPolicy - allowed with chuncked body',
        args: {
            req: {
                host: 'withoutPolicy'
            },
            resBody: ['O', 'K']
        }
    },
    {
        name: 'withoutPolicy - allowed POST with chuncked body',
        args: {
            req: {
                method: 'POST',
                host: 'withoutPolicy',
                body: ['P', 'O', 'S', 'T']
            }
        }
    },
    {
        name: 'withoutPolicy - timeout 1',
        args: {
            req: {
                host: 'withoutPolicy'
            },
            timeout: +config.timeout + 100
        },
        wantStatusCode: 504,
        wantBody: 'Gateway Timeout'
    },
    {
        name: 'withoutPolicy - timeout 2',
        args: {
            req: {
                host: 'withoutPolicy'
            },
            timeout: +config.timeout - 100
        }
    },
    {
        name: 'withPolicy - allowed 1',
        args: {
            req: {
                host: 'withPolicy',
                path: '/allowed'
            }
        }
    },
    {
        name: 'withPolicy - allowed 2',
        args: {
            req: {
                host: 'withPolicy',
                path: '/allowed?key=value'
            }
        }
    },
    {
        name: 'withPolicy - not allowed 1',
        args: {
            req: {
                host: 'withPolicy'
            }
        },
        wantStatusCode: 403,
        wantBody: `Forbidden: GET http://localhost:${config.serverPort}/ is not allowed by policy.`
    },
    {
        name: 'withPolicy - not allowed 2',
        args: {
            req: {
                host: 'withPolicy',
                path: '/allowed/forbidden'
            }
        },
        wantStatusCode: 403,
        wantBody: `Forbidden: GET http://localhost:${config.serverPort}/allowed/forbidden is not allowed by policy.`
    },
    {
        name: 'withPolicy - regex allowed 1',
        args: {
            req: {
                host: 'withPolicy',
                path: '/regexAllowed'
            }
        }
    },
    {
        name: 'withPolicy - regex allowed 1',
        args: {
            req: {
                host: 'withPolicy',
                path: '/regexAllowed/allowed'
            }
        }
    },
    {
        name: 'error - error',
        args: {
            req: {
                host: 'error'
            }
        },
        wantStatusCode: 500,
        wantBody: 'Internal Server Error'
    },
    {
        name: 'socket - healthz',
        args: {
            req: {
                port: +config.socketPort,
                host: 'withoutPolicy',
                path: '/healthz'
            }
        }
    },
    {
        name: 'socket - readyz',
        args: {
            req: {
                port: +config.socketPort,
                host: 'withoutPolicy',
                path: '/readyz'
            }
        }
    },
    {
        name: 'socket - error',
        args: {
            req: {
                port: +config.socketPort,
                host: 'withoutPolicy',
                path: '/error'
            }
        },
        wantStatusCode: 404,
        wantBody: 'Not Found'
    },
    {
        name: 'socket - admin unauthorized',
        args: {
            req: {
                port: +config.socketPort,
                host: 'withoutPolicy',
                path: '/admin'
            }
        },
        wantStatusCode: 401,
        wantBody: 'Unauthorized'
    },
    {
        name: 'socket - admin authorized',
        args: {
            req: {
                port: +config.socketPort,
                host: 'withoutPolicy',
                path: '/admin',
                headers: {
                    authorization: `Basic ${adminCredentials}`
                }
            }
        },
        wantBody: '<!DOCTYPE html>',
        wantBodyToContain: true
    },
    {
        name: 'withIdentifier - allowed',
        args: {
            req: {
                host: 'withIdentifier'
            }
        }
    },
    {
        name: 'withUnkownIdentifier - bad gateway',
        args: {
            req: {
                host: 'withUnknownIdentifier'
            }
        },
        wantStatusCode: 502,
        wantBody: 'Bad Gateway'
    }
]

tests.forEach(function(tt) {
    test(tt.name, async function() {
        const testServer = createServer(async function(req, res) {
            const chunks = []
            for await (const chunk of req) {
                chunks.push(chunk)
            }
            if (req.method === 'GET') {
                expect(chunks.length).toStrictEqual(0)
            }
            const data = Buffer.concat(chunks).toString()
            await new Promise(r => setTimeout(r, tt.args.timeout || 0))
            sendStatus(req, res, tt.args.statusCode || 200, tt.args.resBody || data || 'OK')
        })
        testServer.listen(config.serverPort)
        await new Promise(r => setTimeout(r, 100))
        try {
            const method = tt.args.req.method || 'GET'
            const url = new URL(`http://localhost:${tt.args.req.port || config.appPort}${tt.args.req.path || '/'}`)
            const headers = { host: tt.args.req.host, ...tt.args.req.headers }
            const pendingReq = request(method, url, headers)
            if (tt.args.req.body) {
                [tt.args.req.body].flat().forEach(data => pendingReq.req.write(data))
            }
            pendingReq.req.end()
            const res = await pendingReq.res
            expect(res.statusCode).toStrictEqual(tt.wantStatusCode || tt.args.statusCode || 200)
            const wantBody = [tt.wantBody || tt.args.resBody || tt.args.req.body].flat().join('') || 'OK'
            const chunks = []
            for await (const chunk of res) {
                chunks.push(chunk)
            }
            const data = Buffer.concat(chunks).toString()
            if (tt.wantBodyToContain) {
                expect(data).toContain(wantBody)
            } else {
                expect(data).toStrictEqual(wantBody)
            }
        } finally {
            testServer.close()
        }
    })
})
