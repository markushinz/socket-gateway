import { io, Socket } from 'socket.io-client'
import { request } from './request'
import { sign } from 'jsonwebtoken'

import { Closeable, GatewayRequest, JWTPayload, GatewayResponse } from './models'

type InnerLayerConfig = {
    'private-key': string | Buffer,
    'outer-layer': URL,
    identifier: string,
}

function color(status: number) {
    switch(true){
    case (status >= 500): return 31
    case (status >= 400): return 33
    case (status >= 300): return 36
    case (status >= 200): return 32
    default: return 0
    }
}

export class InnerLayer implements Closeable {
    private reconnect: boolean
    private socket: Promise<Socket>

    constructor(public config: InnerLayerConfig) {
        this.reconnect = true
        this.socket = this.connect()
    }

    private async getChallenge(attempt = 0): Promise<string> {
        const challengeURL = new URL('/challenge', this.config['outer-layer'])
        try {
            const res = await request('GET', challengeURL, {})
            const chunks = []
            for await (const chunk of res) {
                chunks.push(chunk)
            }
            const challenge = Buffer.concat(chunks).toString()
            console.log(`Got challenge "${challenge}" from ${challengeURL}.`)
            return challenge
        } catch (error) {
            console.error(`Could not get challenge from ${challengeURL}. Retrying in 1 second...`)
            if (attempt > 5) {
                console.error(error)
            }
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
            'x-challenge-response': this.solveChallenge(challenge),
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
            console.error(err)
        })

        socket.on('request', async (gatewayReq: GatewayRequest) => {
            let _status = 500
            const gatewayRes: GatewayResponse = {
                uuid: gatewayReq.uuid,
                index: 0,
                status: _status,
                data: 'Internal Server Error',
                headers: { 'content-type': 'text/plain; charset=utf-8' }
            }
            try {
                const res = await request(gatewayReq.method, new URL(gatewayReq.url), gatewayReq.headers, gatewayReq.data)
  
                _status = res.statusCode || _status
                gatewayRes.status = res.statusCode
                delete gatewayRes.data
                gatewayRes.headers = res.headers

                for await (const chunk of res) {
                    gatewayRes.data = chunk
                    socket.emit('response', gatewayRes)
                    gatewayRes.index++
                    delete gatewayRes.status
                    delete gatewayRes.data
                    delete gatewayRes.headers
                }
            } catch (error) {
                console.error(error)
            } finally {
                gatewayRes.end = true
                socket.emit('response', gatewayRes)
                process.stdout.write(`\x1b[0m${gatewayReq.method} ${gatewayReq.url} \x1b[${color(_status)}m${_status}\x1b[0m\n`)
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
