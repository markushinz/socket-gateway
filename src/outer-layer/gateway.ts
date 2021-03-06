import { Server as HTTPServer } from 'http'

import { Response } from 'express'
import { Server } from 'socket.io'

import { ChallengeTool } from './tools/challenge'
import { sanitizeHeaders, rewriteHeaders } from './tools/rewrite'

import { Headers, GatewayResponse, GatewayRequest, JWTPayload } from '../models'

export type Connection = {
    id: string,
    ip: string,
    timestamp: string,
    headers: Headers,
    payload: JWTPayload
}

export class Gateway {
    private io: Server
    private pendingRequests = new Map()
    private connectionsMap = new Map()

    constructor(public challengeTool: ChallengeTool, public timeout: number) {
        this.io = new Server({ serveClient: false })

        this.io.use(function (socket, next) {
            const headers = socket.handshake.headers as { 'x-challenge-response'?: string }
            const challengeResponse = headers['x-challenge-response']
            if (challengeResponse &&
                challengeTool.verifyChallengeResponse(challengeResponse)) {
                next()
            } else {
                next(new Error('Inner Layer did not present a valid challenge / challenge reponse pair.'))
            }
        })

        this.io.on('connection', (socket) => {
            const connection: Connection = {
                id: socket.id,
                ip: socket.handshake.address,
                timestamp: new Date().toUTCString(),
                headers: socket.handshake.headers as Headers,
                payload: challengeTool.decodeChallengeResponse(socket.handshake.headers['x-challenge-response'] as string),
            }
            this.connectionsMap.set(socket.id, connection)

            console.log(`Inner layer ${socket.id} connected.`)

            socket.on('response', (res: GatewayResponse) => {
                const pendingRequest = this.pendingRequests.get(res.uuid)
                if (pendingRequest) {
                    this.pendingRequests.delete(res.uuid)

                    res.headers = sanitizeHeaders(res.headers)
                    res.headers = rewriteHeaders(res.headers, pendingRequest.host, pendingRequest.rewriteHost)
                    pendingRequest.res.status(res.status).set(res.headers)
                    if (res.data) {
                        pendingRequest.res.send(Buffer.from(res.data, 'binary'))
                    } else {
                        pendingRequest.res.end()
                    }
                }
            })

            socket.on('disconnect', () => {
                this.connectionsMap.delete(socket.id)

                if (this.connectionsMap.size == 0) {
                    this.pendingRequests.forEach(pendingRequest => {
                        pendingRequest.res.sendStatus(502)
                    })
                    this.pendingRequests.clear()
                }
                console.log(`Inner layer ${socket.id} disconnected.`)
            })
        })
    }

    get connections(): Connection[] {
        return Array.from(this.connectionsMap.values())
    }

    attach(server: HTTPServer): void {
        this.io.attach(server)
    }

    request(host: string, rewriteHost: string, appRes: Response<unknown>, gatewayReq: GatewayRequest): void {
        if (this.connectionsMap.size > 0) {
            const pendingRequest = {
                uuid: gatewayReq.uuid,
                host,
                rewriteHost,
                res: appRes
            }

            this.pendingRequests.set(pendingRequest.uuid, pendingRequest)

            // Do reproducable scheduling depeing on the remotePort. This will make sure that all requests
            // of one TCP connection get routed to the same inner layer.
            // This does not garantuee any fair scheduling.
            const connectionsArray = Array.from(this.connectionsMap.keys())
            const connectionIndex = (appRes.req?.socket.remotePort ?? 0) % connectionsArray.length
            const connectionID = connectionsArray[connectionIndex]

            this.io.to(connectionID).emit('request', gatewayReq)

            setTimeout(() => {
                if (this.pendingRequests.has(pendingRequest.uuid)) {
                    this.pendingRequests.delete(pendingRequest.uuid)
                    appRes.sendStatus(504)
                }
            }, this.timeout)
        } else {
            appRes.sendStatus(502)
        }
    }
}
