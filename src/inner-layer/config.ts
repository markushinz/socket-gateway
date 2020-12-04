import { readFileSync } from 'fs';
import { hostname } from 'os';

class Config {
    private isDevelopment = process.env.NODE_ENV === 'development';
    innerLayerIdentifier = process.env.SG_INNER_LAYER_IDENTIFIER || hostname();

    outerLayer = (() => {
        const uri = process.env.SG_OUTER_LAYER;
        if (this.isDevelopment) {
            return uri || 'ws://localhost:3001';
        }
        if (uri && (uri.startsWith('https://') || uri.startsWith('wss://'))) {
            return uri;
        }
        console.error('You have to specify an environment variable SG_OUTER_LAYER and the URI has to start with https:// or wss://');
        return process.exit(1);
    })();


    privateKey = (() => {
        if (process.env.SG_INNER_LAYER_PRIVATE_KEY) {
            return process.env.SG_INNER_LAYER_PRIVATE_KEY;
        }
        if (process.env.SG_INNER_LAYER_PRIVATE_KEY_FILE) {
            return readFileSync(process.env.SG_INNER_LAYER_PRIVATE_KEY_FILE);
        }
        console.error('You have to specify the inner layer private key either via the environment variable ' +
            'process.env.SG_INNER_LAYER_PRIVATE_KEY or provide an absolute path to a file using the environment variable ' +
            'process.env.SG_INNER_LAYER_PRIVATE_KEY_FILE');
        return process.exit(1);
    })();
}

export default new Config();
