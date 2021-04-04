import { Server as HTTPServer } from 'http'

import { Response } from 'express'
import { Server } from 'socket.io'
import { v1 as uuid } from 'uuid'

import { ChallengeTool } from './tools/challenge'
import { sanitizeHeaders, rewriteHeaders } from './tools/rewrite'

import { Headers, Data, InnerLayer } from '../models'

export class Gateway {
    io: Server
    pendingRequests = new Map()
    innerLayersMap = new Map()

    constructor(server: HTTPServer, public challengeTool: ChallengeTool, public timeout: number) {
        this.io = new Server(server)

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
            const innerLayer: InnerLayer = {
                id: socket.id,
                ip: socket.handshake.address,
                timestamp: new Date().toUTCString(),
                headers: socket.handshake.headers as Headers,
                payload: challengeTool.decodeChallengeResponse(socket.handshake.headers['x-challenge-response'] as string),
            }
            this.innerLayersMap.set(socket.id, innerLayer)

            console.log(`Inner layer ${socket.id} connected.`)

            socket.on('request', (incomingData: Data) => {
                const pendingRequest = this.pendingRequests.get(incomingData.uuid)
                if (pendingRequest) {
                    this.pendingRequests.delete(incomingData.uuid)

                    incomingData.headers = sanitizeHeaders(incomingData.headers)
                    incomingData.headers = rewriteHeaders(incomingData.headers, incomingData.host, pendingRequest.rewriteHost)
                    pendingRequest.res.status(incomingData.statusCode).set(incomingData.headers)
                    if (incomingData.body) {
                        pendingRequest.res.send(Buffer.from(incomingData.body, 'binary'))
                    } else {
                        pendingRequest.res.end()
                    }
                }
            })

            socket.on('disconnect', () => {
                this.innerLayersMap.delete(socket.id)

                if (this.innerLayersMap.size == 0) {
                    this.pendingRequests.forEach(pendingRequest => {
                        pendingRequest.res.sendStatus(502)
                    })
                    this.pendingRequests.clear()
                }
                console.log(`Inner layer ${socket.id} disconnected.`)
            })
        })
    }

    request(rewriteHost: string, res: Response<unknown>, outgoingData: Record<string, unknown>): void {
        if (this.innerLayersMap.size > 0) {
            const pendingRequest = {
                uuid: uuid(),
                rewriteHost,
                res
            }

            this.pendingRequests.set(pendingRequest.uuid, pendingRequest)

            outgoingData.uuid = pendingRequest.uuid

            // Do reproducable scheduling depeing on the remotePort. This will make sure that all requests
            // of one TCP connection get routed to the same inner layer.
            // This does not garantuee any fair scheduling.
            const innerLayersArray = Array.from(this.innerLayersMap.keys())
            const innerLayerIndex = (res.req?.socket.remotePort ?? 0) % innerLayersArray.length
            const innerLayerID = innerLayersArray[innerLayerIndex]

            this.io.to(innerLayerID).emit('request', outgoingData)

            setTimeout(() => {
                if (this.pendingRequests.has(pendingRequest.uuid)) {
                    this.pendingRequests.delete(pendingRequest.uuid)
                    res.sendStatus(504)
                }
            }, this.timeout)
        } else {
            res.sendStatus(502)
        }
    }

    get innerLayers(): InnerLayer[] {
        return Array.from(this.innerLayersMap.values())
    }
}
