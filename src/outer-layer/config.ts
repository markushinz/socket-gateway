import fs from 'fs';

import yaml from 'js-yaml';

import { Target } from '../models';

type Cache = {
    timestamp?: number
    targets: Record<string, Target>,
};

class Config {
    private cache: Cache;

    constructor() {
        this.cache = {
            targets: {}
        };
    }

    private isDevelopment = process.env.NODE_ENV === 'development';
    appPort = parseInt(process.env.PORT || process.env.SG_APP_PORT || '3000');
    socketPort = parseInt(process.env.SG_SOCKET_PORT || '3001');
    trustProxy = process.env.SG_TRUST_PROXY || 'loopback, linklocal, uniquelocal';
    timeout = parseInt(process.env.SG_TIMEOUT || '10000'); // ms
    challengeValidity = parseInt(process.env.SG_CHALLENGE_VALIDITY || '1000'); // ms

    innerLayerPublicKey = (() => {
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
    })();

    get targets(): Record<string, Target> {
        try {
            const now = Date.now();
            if (!this.cache.timestamp || now - this.cache.timestamp > 60000) {
                const config = yaml.safeLoad(process.env.SG_TARGETS ||
                    fs.readFileSync(process.env.SG_TARGETS_FILE as string, 'utf8')) as {
                        targets: Record<string, Target>
                    };
                this.cache.targets = config.targets;
                this.cache.timestamp = now;
            }
            return this.cache.targets;
        } catch (error) {
            console.error(error);
            return {};
        }
    }

    adminCredentials = (() => {
        const adminPassword = process.env.SG_ADMIN_PASSWORD;
        if (this.isDevelopment || adminPassword) {
            return Buffer.from(`${process.env.SG_ADMIN_USERNAME || 'admin'}:${adminPassword || 'admin'}`).toString('base64');
        } else {
            return undefined;
        }
    })();
}

export default new Config();
