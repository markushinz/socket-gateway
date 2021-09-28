import { Server as HTTPServer, IncomingMessage, ServerResponse } from 'http'

import { Server } from 'socket.io'

import { ChallengeTool } from './tools/challenge'
import { RewriteTool } from './tools/rewrite'

import { Headers, GatewayResponse, GatewayRequest, JWTPayload } from '../models'
import { log, sendStatus, setHeaders } from '../helpers'

export type Connection = {
    id: string;
    ip: string;
    timestamp: string;
    headers: Headers;
    payload: JWTPayload;
}

type PendingRequest = {
    uuid: string;
    host: string;
    rewriteHost: string;
    req: IncomingMessage;
    res: ServerResponse;
}

export class Gateway {
    private io: Server
    private pendingReqs: Map<string, PendingRequest> = new Map()
    private connectionsMap: Map<string, Connection> = new Map()

    constructor(public challengeTool: ChallengeTool, public rewriteTool: RewriteTool, public timeout: number) {
        this.io = new Server({ serveClient: false })

        this.io.use(function(socket, next) {
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
                payload: challengeTool.decodeChallengeResponse(socket.handshake.headers['x-challenge-response'] as string)
            }
            this.connectionsMap.set(socket.id, connection)

            console.log(`Inner layer ${socket.id} connected.`)

            socket.on('response', (gwRes: GatewayResponse) => {
                const pendingReq = this.pendingReqs.get(gwRes.uuid)
                if (pendingReq) {
                    if (gwRes.statusCode) {
                        pendingReq.res.statusCode = gwRes.statusCode
                    }
                    if (gwRes.statusMessage) {
                        pendingReq.res.statusMessage = gwRes.statusMessage
                    }
                    if (gwRes.headers) {
                        gwRes.headers = rewriteTool.sanitizeHeaders(gwRes.headers)
                        gwRes.headers = rewriteTool.rewriteHeaders(gwRes.headers, pendingReq.host, pendingReq.rewriteHost)
                        setHeaders(pendingReq.res, gwRes.headers)
                    }
                    if (gwRes.data) {
                        pendingReq.res.write(gwRes.data)
                    }
                    if (gwRes.end) {
                        this.pendingReqs.delete(gwRes.uuid)
                        pendingReq.res.end()
                        log(pendingReq.req, pendingReq.res)
                    }
                }
            })

            socket.on('disconnect', () => {
                this.connectionsMap.delete(socket.id)

                if (this.connectionsMap.size == 0) {
                    this.pendingReqs.forEach(pendingReq => {
                        sendStatus(pendingReq.req, pendingReq.res, 502)
                    })
                    this.pendingReqs.clear()
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

    request(identifier: undefined | string | string[], host: string, rewriteHost: string, appReq: IncomingMessage, appRes: ServerResponse, gwReq: GatewayRequest): void {
        const possibleConnections = this.connections.filter(connection => {
            return !identifier || [identifier].flat().includes(connection.payload.identifier)
        })
        
        if (possibleConnections.length > 0) {
            const pendingReq: PendingRequest = {
                uuid: gwReq.uuid,
                host,
                rewriteHost,
                req: appReq,
                res: appRes
            }

            this.pendingReqs.set(pendingReq.uuid, pendingReq)

            // Do reproducable scheduling depeing on the remotePort. This will make sure that all requests
            // of one TCP connection get routed to the same inner layer.
            // This does not garantuee any fair scheduling.
            const connectionIndex = (appReq.socket.remotePort ?? 0) % possibleConnections.length
            const connectionID = possibleConnections[connectionIndex].id

            this.io.to(connectionID).emit('request', gwReq)

            setTimeout(() => {
                if (this.pendingReqs.has(pendingReq.uuid)) {
                    this.pendingReqs.delete(pendingReq.uuid)
                    sendStatus(appReq, appRes, 504)
                }
            }, this.timeout)
        } else {
            sendStatus(appReq, appRes, 502)
        }
    }
}
