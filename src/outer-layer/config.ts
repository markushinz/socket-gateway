import { readFileSync } from 'fs'

import { load } from 'js-yaml'

import { Cache, Target } from '../models'

export class OuterLayerConfig {
    private cache: Cache
    appPort: number
    socketPort: number
    publicKey: string | Buffer
    targets: string
    adminPassword: string | undefined
    trustProxy: string
    timeout: number
    validity: number

    constructor(
        argv: {
            'admin-password'?: string;
            'trust-proxy': string;
            timeout: number;
            validity: number;
            'app-port': number;
            'socket-port': number;
            'public-key': string | Buffer;
            targets: string;
        },
    ) {
        this.adminPassword = argv['admin-password']
        this.trustProxy = argv['trust-proxy'],
        this.timeout = argv.timeout,
        this.validity = argv.validity,
        this.appPort = argv['app-port']
        this.socketPort = argv['socket-port']
        this.publicKey = argv['public-key']
        this.targets = argv.targets,

        this.cache = {
            targets: {}
        }
    }

    get targetsParsed(): Record<string, Target> {
        try {
            const now = Date.now()
            if (!this.cache.timestamp || now - this.cache.timestamp > 60000) {
                const config = load(readFileSync(this.targets as string, 'utf8')) as {
                        targets: Record<string, Target>
                    }
                this.cache.targets = config.targets
                this.cache.timestamp = now
            }
            return this.cache.targets
        } catch (error) {
            console.error(error)
            return {}
        }
    }

    adminCredentialsParsed = (() => {
        if (this.adminPassword) {
            return Buffer.from(`admin:${this.adminPassword}`).toString('base64')
        } else {
            return undefined
        }
    })()
}
