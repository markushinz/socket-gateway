import { IncomingHttpHeaders, OutgoingHttpHeaders, ClientRequest, IncomingMessage, ServerResponse } from 'http'

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
    statusCode: number;
    statusMessage: string;
    headers: Headers;
}

export type JWTPayload = {
    challenge: string;
    identifier: string;
}

export interface Closeable {
    close: () => void;
}

export type PendingClientRequest = {
    req: ClientRequest;
    res: Promise<IncomingMessage>;
}

export type PendingServerRequest = {
    host: string;
    rewriteHost: string;
    req: IncomingMessage;
    res: ServerResponse;
}
