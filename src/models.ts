import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'

export type Policy = '*' | Record<string, '*' | string[]>

export type Target = {
    protocol?: 'http' | 'https';
    hostname: string;
    port?: number;
    policy?: Policy;
    identifier?: string | string[];
}

export type Headers = IncomingHttpHeaders | OutgoingHttpHeaders

export type GatewayRequest = {
    url: string;
    method: string;
    headers: Headers;
}

export type GatewayResponse = {
    headers?: Headers;
    data?: string;
    statusCode?: number;
    statusMessage?: string;
    end?: boolean;
}

export type JWTPayload = {
    challenge: string;
    identifier: string;
}

export interface Closeable {
    close: () => void;
}
