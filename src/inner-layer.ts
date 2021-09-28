import { io, Socket } from 'socket.io-client'
import { request } from './request'
import { sign } from 'jsonwebtoken'

import { Closeable, GatewayRequest, JWTPayload, GatewayResponse } from './models'
import { color } from './helpers'

type InnerLayerConfig = {
    'private-key': string | Buffer;
    'outer-layer': URL;
    identifier: string;
}

export class InnerLayer implements Closeable {
    private reconnect: boolean
    private socket: Promise<Socket>

    constructor (public config: InnerLayerConfig) {
        this.reconnect = true
        this.socket = this.connect()
    }

    private async getChallenge (attempt = 0): Promise<string> {
        const challengeURL = new URL('/challenge', this.config['outer-layer'])
        try {
            const res = await request('GET', challengeURL, {})
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

    private solveChallenge (challenge: string) {
        const payload: JWTPayload = { challenge, identifier: this.config.identifier }
        return sign(payload, this.config['private-key'], { algorithm: 'RS256' })
    }

    private async getHeaders () {
        const challenge = await this.getChallenge()
        return {
            'x-challenge-response': this.solveChallenge(challenge)
        }
    }

    private async connect () {
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

        socket.on('request', async (gatewayReq: GatewayRequest) => {
            let _statusCode = 500
            const gatewayRes: GatewayResponse = {
                uuid: gatewayReq.uuid,
                statusCode: _statusCode,
                statusMessage: 'Internal Server Error',
                data: 'Internal Server Error',
                headers: { 'content-type': 'text/plain; charset=utf-8' }
            }
            try {
                const res = await request(gatewayReq.method, new URL(gatewayReq.url), gatewayReq.headers, gatewayReq.data)
  
                _statusCode = res.statusCode || _statusCode
                gatewayRes.statusCode = res.statusCode
                gatewayRes.statusMessage = res.statusMessage
                delete gatewayRes.data
                gatewayRes.headers = res.headers

                for await (const chunk of res) {
                    gatewayRes.data = chunk
                    socket.emit('response', gatewayRes)
                    delete gatewayRes.statusCode
                    delete gatewayRes.statusMessage
                    delete gatewayRes.data
                    delete gatewayRes.headers
                }
            } catch (error) {
                console.error('request', gatewayReq, error)
            } finally {
                gatewayRes.end = true
                socket.emit('response', gatewayRes)
                process.stdout.write(`\x1b[0m${gatewayReq.method} ${gatewayReq.url} \x1b[${color(_statusCode)}m${_statusCode}\x1b[0m\n`)
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

    async close (): Promise<void> {
        this.reconnect = false;
        (await this.socket).close()
    }
}
