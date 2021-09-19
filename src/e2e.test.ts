import { createServer } from 'http'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import axios, { Method } from 'axios'

import { cli } from './cli'
import { Closeable, Target, Headers } from './models'

const directory = mkdtempSync(join(tmpdir(), 'socket-gateway-'))
const config = {
    appPort: '4000',
    socketPort: '4001',
    serverPort: 4002,
    timeout: '500',
    adminPassword: 'admin',
    privateKey: join(directory,'innerLayer.key'),
    publicKey: join(directory,'innerLayer.crt'),
    targets: join(directory,'targets.yaml')
}
const adminCredentials = Buffer.from(`admin:${config.adminPassword}`).toString('base64')
writeFileSync(join(directory,'targets.yaml'), JSON.stringify({
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
            },
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
        },
    } as Record<string,Target>
}))

const closeables: Closeable[] = []
beforeAll(async function() {
    closeables.push(await cli(['certificates', '--private-key', config.privateKey,  '--public-key', config.publicKey]))
    closeables.push(await cli(['inner-layer', '--outer-layer', `ws://localhost:${config.socketPort}`, '--private-key', config.privateKey, '--identifier', 'identifier']))
    closeables.push(await cli(['outer-layer', '--app-port', config.appPort, '--socket-port', config.socketPort, '--timeout', config.timeout, '--targets', config.targets, '--public-key', config.publicKey, '--admin-password', config.adminPassword]))
})

afterAll(async function () {
    closeables.forEach(closbale => closbale.close())
    rmSync(directory, { recursive: true, force: true })
})

type Test = {
    name: string,
    args: {
        req: {
            method?: Method,
            port?: number,
            host: string
            path?: string,
            headers?: Headers
        },
        timeout?: number,
        statusCode?: number,
        body?: string,
    },
    wantStatusCode?: number
    wantBody?: string
}

const tests: Test[] = [
    {
        name: 'withoutPolicy - allowed',
        args: {
            req: {
                host: 'withoutPolicy'
            }
        }
    },
    {
        name: 'withoutPolicy - timeout 1',
        args: {
            req: {
                host: 'withoutPolicy'
            },
            timeout: +config.timeout + 100,
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
            timeout: +config.timeout - 100,
        },
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
                host: 'error',
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
        wantBody: '<!DOCTYPE html>'
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
    },
]

tests.forEach(function (tt) {
    test(tt.name, async function () {
        const testServer = createServer(async function (_req, res) {
            await new Promise(r => setTimeout(r, tt.args.timeout || 0))
            res.setHeader('content-type', 'text/plain')
            res.statusCode = tt.args.statusCode || 200
            res.end(tt.args.body || 'OK')
        })
        testServer.listen(config.serverPort)
        await new Promise(r => setTimeout(r, 100))
        const response = await axios(`http://localhost:${tt.args.req.port || config.appPort}${tt.args.req.path || '/'}`, { method: tt.args.req.method || 'GET', validateStatus: undefined, headers: { host: tt.args.req.host, ...tt.args.req.headers } })

        expect(response.status).toStrictEqual(tt.wantStatusCode || tt.args.statusCode || 200)
        expect(response.data).toContain(tt.wantBody || tt.args.body || 'OK')

        testServer.close()
    })
})
