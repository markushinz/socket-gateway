export type Policy = Record<string, string[]>;

export type Target = {
    protocol?: 'http' | 'https',
    hostname: string,
    port?: number,
    policy?: Policy
};

export type Cache = {
    targets: Record<string, Target>,
    timestamp?: number
};
