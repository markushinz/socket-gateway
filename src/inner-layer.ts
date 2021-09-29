import { IncomingMessage, ServerResponse } from 'http'
import { io, Socket } from 'socket.io-client'
import { request, requestLegacy } from './request'
import { sign } from 'jsonwebtoken'

import { Closeable, GatewayRequest, JWTPayload, GatewayResponse } from './models'
import { color } from './helpers'

type InnerLayerConfig = {
    'private-key': string | Buffer;
    'outer-layer': URL;
    identifier: string;
}

type PendingResponse = {
    req: IncomingMessage;
    res: ServerResponse;
}

export class InnerLayer implements Closeable {
    private reconnect: boolean
    private socket: Promise<Socket>

    private pendingReses: Map<string, PendingResponse> = new Map()

    constructor(public config: InnerLayerConfig) {
        this.reconnect = true
        this.socket = this.connect()
    }

    private async getChallenge(attempt = 0): Promise<string> {
        const challengeURL = new URL('/challenge', this.config['outer-layer'])
        try {
            const res = await requestLegacy('GET', challengeURL, {})
            if (res.statusCode !== 200) {
                throw new Error(`Unexpected status ${res.statusCode} ${res.statusMessage}`)
            }
            const chunks = []
            for await (const chunk of res) {
                chunks.push(chunk)
            }
            const challenge = Buffer.concat(chunks).toString()
            console.log(`Got challenge "${challenge}" from ${challengeURL}.`)
            return challenge
        } catch (err) {
            console.error(`Could not get challenge from ${challengeURL}. Retrying in 1 second...`, err)
            await new Promise(resolve => setTimeout(resolve, 1000))
            return this.getChallenge(attempt ? attempt + 1 : 1)
        }
    }

    private solveChallenge(challenge: string) {
        const payload: JWTPayload = { challenge, identifier: this.config.identifier }
        return sign(payload, this.config['private-key'], { algorithm: 'RS256' })
    }

    private async getHeaders() {
        const challenge = await this.getChallenge()
        return {
            'x-challenge-response': this.solveChallenge(challenge)
        }
    }

    private async connect() {
        const outerLayer = this.config['outer-layer'].href
        const socket = io(outerLayer, {
            transportOptions: {
                polling: {
                    extraHeaders: await this.getHeaders()
                }
            },
            reconnection: false
        })

        console.log(`Connecting to outer layer ${outerLayer}...`)

        socket.on('connect', () => {
            console.log(`Outer Layer ${outerLayer} connected.`)
        })

        socket.on('connect_error', err => {
            console.error('connect_error', err)
            if (this.reconnect) {
                this.socket = this.connect()
            }
        })

        socket.on('gw_req', async(uuid: string, gwReq: GatewayRequest) => {
            let _statusCode = 500
            const gwRes: GatewayResponse = {
                statusCode: _statusCode,
                statusMessage: 'Internal Server Error',
                data: 'Internal Server Error',
                headers: { 'content-type': 'text/plain; charset=utf-8' }
            }
            try {
                const { req, res } = request(gwReq.method, new URL(gwReq.url), gwReq.headers)
                if (gwReq.data) {
                    req.setHeader('content-length', gwReq.data.length)
                    req.write(gwReq.data)
                }
                req.end()
                const innerRes = await res
                _statusCode = innerRes.statusCode || _statusCode
                gwRes.statusCode = innerRes.statusCode
                gwRes.statusMessage = innerRes.statusMessage
                delete gwRes.data
                gwRes.headers = innerRes.headers

                for await (const chunk of innerRes) {
                    gwRes.data = chunk
                    socket.emit('gw_res', uuid, gwRes)
                    delete gwRes.statusCode
                    delete gwRes.statusMessage
                    delete gwRes.data
                    delete gwRes.headers
                }
            } catch (error) {
                console.error('gw_req', gwReq, error)
            } finally {
                gwRes.end = true
                socket.emit('gw_res', uuid, gwRes)
                process.stdout.write(`\x1b[0m${gwReq.method} ${gwReq.url} \x1b[${color(_statusCode)}m${_statusCode}\x1b[0m\n`)
            }
        })

        socket.on('disconnect', () => {
            console.log(`Outer Layer ${outerLayer} disconnected.`)
            if (this.reconnect) {
                this.socket = this.connect()
            }
        })

        return socket
    }

    async close(): Promise<void> {
        this.reconnect = false;
        (await this.socket).close()
    }
}
