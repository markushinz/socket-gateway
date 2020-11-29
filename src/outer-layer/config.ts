import fs from 'fs';
import process from 'process';

import yaml from 'js-yaml';

const developmentMode = process.env.NODE_ENV === 'development';

export type Target = {
    protocol?: 'http' | 'https',
    hostname: string,
    port?: number,
    policy?: Policy
};

export type Policy = Record<string, string[]>;

interface Config {
    targets: Record<string, Target>
}

interface Cache {
    targets: Record<string, Target>,
    timestamp?: number
}

const cache: Cache = {
    targets: {}
};

export const appPort = process.env.PORT || process.env.SG_APP_PORT || 3000;
export const socketPort = process.env.SG_SOCKET_PORT || 3001;
export const trustProxy = process.env.SG_TRUST_PROXY || 'loopback, linklocal, uniquelocal';
export const timeout = process.env.SG_TIMEOUT ? parseInt(process.env.SG_TIMEOUT) : 6000 || 60000;  // ms
export const challengeValidity = process.env.SG_CHALLENGE_VALIDITY ? parseInt(process.env.SG_CHALLENGE_VALIDITY) || 50000 : 5000; // ms

export const innerLayerPublicKey = function () {
    if (process.env.SG_INNER_LAYER_PUBLIC_KEY) {
        return process.env.SG_INNER_LAYER_PUBLIC_KEY;
    }
    if (process.env.SG_INNER_LAYER_PUBLIC_KEY_FILE) {
        return fs.readFileSync(process.env.SG_INNER_LAYER_PUBLIC_KEY_FILE);
    }
    console.error('You have to specify the inner layer public key either via the environment variable ' +
        'process.env.SG_INNER_LAYER_PUBLIC_KEY or provide an absolute path to a file using the environment variable ' +
        'process.env.SG_INNER_LAYER_PUBLIC_KEY_FILE');
    process.exit(1);
}();

export function getTargets(): Record<string, Target> {
    try {
        const now = Date.now();
        if (!cache.timestamp || now - cache.timestamp > 60000) {
            const config = yaml.safeLoad(process.env.SG_TARGETS ||
                fs.readFileSync(process.env.SG_TARGETS_FILE as string, 'utf8')) as Config;
            cache.targets = config.targets;
            cache.timestamp = now;
        }
        return cache.targets;
    } catch (error) {
        console.error(error);
        return {};
    }
}

export const adminCredentials = function () {
    const adminPassword = process.env.SG_ADMIN_PASSWORD;
    if (developmentMode || adminPassword) {
        return Buffer.from(`${process.env.SG_ADMIN_USERNAME || 'admin'}:${adminPassword || 'admin'}`).toString('base64');
    } else {
        return null;
    }
}();
