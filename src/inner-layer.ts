import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import { sign } from 'jsonwebtoken'

import { Closeable, GatewayRequest, JWTPayload, GatewayResponse } from './models'

type InnerLayerConfig = {
    'private-key': string | Buffer,
    'outer-layer': URL,
    identifier: string,
    insecure: boolean
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
        const challengeURL = new URL('/challenge', this.config['outer-layer']).href
        try {
            const response = await axios.get(challengeURL)
            const challenge = response.data
            console.log(`Got challenge "${challenge}" from ${challengeURL}.`)
            return challenge
        } catch (error) {
            console.error(`Could not get challenge from ${challengeURL}. Retrying in 1 second...`)
            if (attempt > 5) {
                console.error(error)
            }
            await new Promise(function (resolve) { setTimeout(resolve, attempt * 1000) })
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
        if (
            !this.config.insecure &&
            !['localhost', '127.0.0.1', '[::1]'].includes(this.config['outer-layer'].hostname) &&
            !['https:', 'wss:'].includes(this.config['outer-layer'].hostname)
        ) {
            throw(new Error('Outer layer protocol must be https: or wss:'))
        }

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

        socket.on('request', async (req: GatewayRequest) => {
            const res: GatewayResponse = {
                uuid: req.uuid,
                status: 500,
                data: 'Internal Server Error',
                headers: { 'content-type': 'text/plain' }
            }
            try {
                const { status, data, headers } = await axios({
                    ...req,
                    maxRedirects: 0,
                    responseType: 'arraybuffer',
                    validateStatus: null,
                    decompress: false
                })
                res.status = status
                res.data = data.toString('binary')
                res.headers = headers
            } catch (error) {
                console.error(error)
            } finally {
                socket.emit('response', res)
                process.stdout.write(`\x1b[0m${req.method} ${req.url} \x1b[${color(res.status)}m${res.status}\x1b[0m\n`)
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
