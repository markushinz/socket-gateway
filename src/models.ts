import { AxiosRequestConfig } from "axios";

export type Policy = Record<string, string[]>;

export type Target = {
    protocol?: 'http' | 'https',
    hostname: string,
    port?: number,
    policy?: Policy
};

export interface IncomingData {
    method: AxiosRequestConfig["method"],
    url: AxiosRequestConfig["url"],
    headers: AxiosRequestConfig["headers"],
    query: AxiosRequestConfig["params"],
    body: AxiosRequestConfig["data"],
    uuid: string,
    host: string
}
