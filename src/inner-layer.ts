import { io, Socket } from 'socket.io-client'
import { request } from './request'
import { sign } from 'jsonwebtoken'

import { Closeable, GatewayRequest, JWTPayload, GatewayResponse, PendingClientRequest } from './models'
import { log } from './helpers'

type InnerLayerConfig = {
    'private-key': string | Buffer;
    'outer-layer': URL;
    identifier: string;
}

export class InnerLayer implements Closeable {
    private reconnect: boolean
    private socket: Promise<Socket>

    private pendingReqs: Map<string, PendingClientRequest> = new Map()

    constructor(public config: InnerLayerConfig) {
        this.reconnect = true
        this.socket = this.connect()
    }

    private async getChallenge(attempt = 0): Promise<string> {
        const challengeURL = new URL('/challenge', this.config['outer-layer'])
        try {
            const pendingReq = request('GET', challengeURL, {})
            pendingReq.req.end()
            const res = await pendingReq.res
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
            try {
                const pendingReq = request(gwReq.method, new URL(gwReq.url), gwReq.headers)
                this.pendingReqs.set(uuid, pendingReq)
                const innerRes = await pendingReq.res
                const gwRes: GatewayResponse = {
                    statusCode: innerRes.statusCode || 0,
                    statusMessage: innerRes.statusMessage || '',
                    headers: innerRes.headers
                }
                socket.emit('gw_res', uuid, gwRes)
                for await (const data of innerRes) {
                    socket.emit('gw_res_data', uuid, data)
                }
                socket.emit('gw_res_end', uuid)
                log(gwReq.method, gwReq.url, gwRes.statusCode)
            } catch (error) {
                const data = 'Internal Server Error'
                const gwRes: GatewayResponse = {
                    statusCode: 500,
                    statusMessage: 'Internal Server Error',
                    headers: { 
                        'content-type': 'text/plain; charset=utf-8',
                        'content-length': data.length 
                    }
                }
                socket.emit('gw_res', uuid, gwRes)
                socket.emit('gw_res_data', uuid, data)
                socket.emit('gw_res_end', uuid)
                console.error(error, 'gw_req', gwReq, 'gw_res', gwRes)
            } finally {
                this.pendingReqs.delete(uuid)
            }
        })

        socket.on('gw_req_data', async(uuid: string, data: Buffer) => {
            const pendingReq = this.pendingReqs.get(uuid)
            if (pendingReq) {
                pendingReq.req.write(data)
            }
        })

        socket.on('gw_req_end', async(uuid: string) => {
            const pendingReq = this.pendingReqs.get(uuid)
            if (pendingReq) {
                pendingReq.req.end()
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
