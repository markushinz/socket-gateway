import { Server as HTTPServer, IncomingMessage, ServerResponse } from 'http'
import { v1 } from 'uuid'

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

            socket.on('response', (uuid: string, gwRes: GatewayResponse) => {
                const pendingReq = this.pendingReqs.get(uuid)
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
                        this.pendingReqs.delete(uuid)
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

    request(identifier: undefined | string | string[], host: string, rewriteHost: string, outerReq: IncomingMessage, outerRes: ServerResponse, gwReq: GatewayRequest): void {
        const possibleConnections = this.connections.filter(connection => {
            return !identifier || [identifier].flat().includes(connection.payload.identifier)
        })
        
        if (possibleConnections.length > 0) {
            const uuid = v1()
            const pendingReq: PendingRequest = {
                host,
                rewriteHost,
                req: outerReq,
                res: outerRes
            }

            this.pendingReqs.set(uuid, pendingReq)

            // Do reproducable scheduling depeing on the remotePort. This will make sure that all requests
            // of one TCP connection get routed to the same inner layer.
            // This does not garantuee any fair scheduling.
            const connectionIndex = (outerReq.socket.remotePort ?? 0) % possibleConnections.length
            const connectionID = possibleConnections[connectionIndex].id

            this.io.to(connectionID).emit('request', uuid, gwReq)

            setTimeout(() => {
                if (this.pendingReqs.has(uuid)) {
                    this.pendingReqs.delete(uuid)
                    sendStatus(outerReq, outerRes, 504)
                }
            }, this.timeout)
        } else {
            sendStatus(outerReq, outerRes, 502)
        }
    }
}
