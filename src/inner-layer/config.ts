import fs from 'fs';
import os from 'os';

const developmentMode = process.env.NODE_ENV === 'development';

export function getOuterLayer(): string {
    const uri = process.env.SG_OUTER_LAYER;
    if (developmentMode) {
        return uri || 'ws://localhost:3000';
    }
    if (uri && (uri.startsWith('https://') || uri.startsWith('wss://'))) {
        return uri;
    }
    console.error('You have to specify an environment variable SG_OUTER_LAYER and the URI has to start with https:// or wss://');
    return process.exit(1);
}

export function getInnerLayerPrivateKey(): string | Buffer {
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

export function getInnerLayerIdentifier(): string {
    return process.env.SG_INNER_LAYER_IDENTIFIER || os.hostname();
}
