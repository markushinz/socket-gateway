import { Server as HTTPServer, IncomingMessage, ServerResponse } from 'http'
import { v1 } from 'uuid'

import { Server } from 'socket.io'

import { ChallengeTool } from './tools/challenge'
import { RewriteTool } from './tools/rewrite'

import { Headers, GatewayResponse, GatewayRequest, JWTPayload, PendingServerRequest } from '../models'
import { log, sendStatus, setHeaders } from '../helpers'

export type Connection = {
    id: string;
    ip: string;
    timestamp: string;
    headers: Headers;
    payload: JWTPayload;
}

export class Gateway {
    private io: Server
    private pendingReqs: Map<string, PendingServerRequest> = new Map()
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

            socket.on('gw_res', (uuid: string, gwRes: GatewayResponse) => {
                const pendingReq = this.pendingReqs.get(uuid)
                if (pendingReq) {
                    pendingReq.lastHeartbeat = new Date()
                    pendingReq.res.statusCode = gwRes.statusCode
                    pendingReq.res.statusMessage = gwRes.statusMessage
                    gwRes.headers = rewriteTool.sanitizeHeaders(gwRes.headers)
                    gwRes.headers = rewriteTool.rewriteHeaders(gwRes.headers, pendingReq.host, pendingReq.rewriteHost)
                    setHeaders(pendingReq.res, gwRes.headers)
                }
            })

            socket.on('gw_res_data', (uuid: string, data: Buffer) => {
                const pendingReq = this.pendingReqs.get(uuid)
                if (pendingReq) {
                    pendingReq.lastHeartbeat = new Date()
                    pendingReq.res.write(data)
                }
            })

            socket.on('gw_res_end', (uuid: string) => {
                const pendingReq = this.pendingReqs.get(uuid)
                if (pendingReq) {
                    pendingReq.lastHeartbeat = new Date()
                    this.pendingReqs.delete(uuid)
                    pendingReq.res.end()
                    log(pendingReq.req.method, pendingReq.req.url, pendingReq.res.statusCode, pendingReq.req.headers.host)
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

    async request(identifier: undefined | string | string[], host: string, rewriteHost: string, outerReq: IncomingMessage, outerRes: ServerResponse, gwReq: GatewayRequest): Promise<void> {
        const possibleConnections = this.connections.filter(connection => {
            return !identifier || [identifier].flat().includes(connection.payload.identifier)
        })
        
        if (possibleConnections.length > 0) {
            const uuid = v1()
            const pendingReq: PendingServerRequest = {
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

            this.checkTimeout(uuid, pendingReq)

            this.io.to(connectionID).emit('gw_req', uuid, gwReq)
            for await (const data of outerReq) {
                this.io.to(connectionID).emit('gw_req_data', uuid, data)
            }
            this.io.to(connectionID).emit('gw_req_end', uuid)
        } else {
            sendStatus(outerReq, outerRes, 502)
        }
    }

    checkTimeout(uuid: string, pendingReq: PendingServerRequest, checkInTime = this.timeout) {
        setTimeout(() => {
            const pr = this.pendingReqs.get(uuid)
            if (pr) {
                const timeSinceLastHeartbeat = pr.lastHeartbeat ? Date.now() - pr.lastHeartbeat.getTime() : this.timeout
                const timeTillTimeout = this.timeout - timeSinceLastHeartbeat
                if (timeTillTimeout > 0) {
                    this.checkTimeout(uuid, pendingReq, timeTillTimeout)
                } else {
                    this.pendingReqs.delete(uuid)
                    sendStatus(pendingReq.req, pendingReq.res, 504)
                }
               
            }
        }, checkInTime)
    }
}
