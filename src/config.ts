import fs from 'fs';
import os from 'os';

import yaml from 'js-yaml';

import { Cache, Target } from './models';

class Config {
    private cache: Cache;

    constructor() {
        this.cache = {
            targets: {}
        };
    }

    private get isDevelopment(): boolean { return process.env.NODE_ENV === 'development'; }
    get appPort(): number { return parseInt(process.env.PORT || process.env.SG_APP_PORT || "3000"); }
    get socketPort(): number { return parseInt(process.env.SG_SOCKET_PORT || "3001"); }
    get trustProxy(): string { return process.env.SG_TRUST_PROXY || 'loopback, linklocal, uniquelocal'; }
    get timeout(): number { return parseInt(process.env.SG_TIMEOUT || "10000"); } // ms
    get challengeValidity(): number { return parseInt(process.env.SG_CHALLENGE_VALIDITY || "5000"); } // ms
    get innerLayerIdentifier(): string { return process.env.SG_INNER_LAYER_IDENTIFIER || os.hostname(); }

    get outerLayer(): string {
        const uri = process.env.SG_OUTER_LAYER;
        if (this.isDevelopment) {
            return uri || `ws://localhost:${this.socketPort}`;
        }
        if (uri && (uri.startsWith('https://') || uri.startsWith('wss://'))) {
            return uri;
        }
        console.error('You have to specify an environment variable SG_OUTER_LAYER and the URI has to start with https:// or wss://');
        return process.exit(1);
    }

    get publicKey(): string | Buffer {
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
    }

    get privateKey(): string | Buffer {
        if (process.env.SG_INNER_LAYER_PRIVATE_KEY) {
            return process.env.SG_INNER_LAYER_PRIVATE_KEY;
        }
        if (process.env.SG_INNER_LAYER_PRIVATE_KEY_FILE) {
            return fs.readFileSync(process.env.SG_INNER_LAYER_PRIVATE_KEY_FILE);
        }
        console.error('You have to specify the inner layer private key either via the environment variable ' +
            'process.env.SG_INNER_LAYER_PRIVATE_KEY or provide an absolute path to a file using the environment variable ' +
            'process.env.SG_INNER_LAYER_PRIVATE_KEY_FILE');
        return process.exit(1);
    }

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

    get adminCredentials(): string | undefined {
        const adminPassword = process.env.SG_ADMIN_PASSWORD;
        if (this.isDevelopment || adminPassword) {
            return Buffer.from(`${process.env.SG_ADMIN_USERNAME || 'admin'}:${adminPassword || 'admin'}`).toString('base64');
        } else {
            return undefined;
        }
    }
}

export default new Config();
