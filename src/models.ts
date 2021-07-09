import { Method } from 'axios'

export type Policy = Record<string, (Method | '*')[]>

export type Target = {
    protocol?: 'http' | 'https',
    hostname: string,
    port?: number,
    policy?: Policy
}

export type Cache = {
    timestamp?: number
    targets: Record<string, Target>,
}

export type Headers = Record<string, string | string[]>

export type Data = {
    uuid: string,
    method: Method,
    host: string,
    url: string,
    headers: Headers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
    body: string | undefined,
    statusCode: number
}

export type JWTPayload = {
    challenge: string,
    identifier: string
}

export type InnerLayer = {
    id: string,
    ip: string,
    timestamp: string,
    headers: Headers,
    payload: JWTPayload
}

export interface Closeable {
    close: () => void
}