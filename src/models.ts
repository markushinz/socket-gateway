import { v1 as uuid } from 'uuid'

export type Policy = '*' | Record<string, '*' | string[]>

export type Target = {
    protocol?: 'http' | 'https',
    hostname: string,
    port?: number,
    policy?: Policy
    identifier? : string | string[]
}

export type Headers = Record<string, string | string[] | undefined>

export class GatewayRequest {
    uuid: string
    url: string
    method: string
    headers: Headers
    data: string | undefined

    constructor(raw: {
        method: string,
        url: URL,
        headers: Headers
        data: string | undefined}
    ) {
        this.uuid = uuid()
        this.method = raw.method
        this.url = raw.url.href
        this.headers = raw.headers
        this.data = raw.data
    }
}

export type GatewayResponse = {
    uuid: string,
    index: number,
    headers?: Headers,
    data?: string
    status?: number
    end?: boolean
}

export type JWTPayload = {
    challenge: string,
    identifier: string
}

export interface Closeable {
    close: () => void
}
