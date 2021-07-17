import { Method } from 'axios'
import { v1 as uuid } from 'uuid'

export type Policy = '*' | Record<string, '*' | (Method | '*')[]>

export type Target = {
    protocol?: 'http' | 'https',
    hostname: string,
    port?: number,
    policy?: Policy
}

export type Headers = Record<string, string | string[]>

export class GatewayRequest {
    uuid: string
    url: string
    method: Method
    headers: Headers
    data: string | undefined

    constructor(raw: {
        method: string,
        url: URL,
        headers: Headers
        data: string | undefined}
    ) {
        this.uuid = uuid()
        this.method = raw.method as Method
        this.url = raw.url.href
        this.headers = raw.headers
        this.data = raw.data
    }
}

export type GatewayResponse = {
    uuid: string,
    headers: Headers,
    data: string | undefined
    status: number
}

export type JWTPayload = {
    challenge: string,
    identifier: string
}

export interface Closeable {
    close: () => void
}