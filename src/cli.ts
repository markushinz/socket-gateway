import yargs from 'yargs'

import { hostname } from 'os'
import { readFileSync, writeFileSync } from 'fs'
import { InnerLayer } from './inner-layer'
import { OuterLayer } from './outer-layer'
import { pki } from 'node-forge'
import { Closeable } from './models'

function coerceOuterLayer(url: string): URL {
    const parsed = new URL(url)
    if (
        ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || 
        ['https:', 'wss:'].includes(parsed.protocol)
    ) {
        return parsed
    }
    throw(new Error('Protocol must be https: or wss:'))
}

function coerceFileExists(file: string) {
    readFileSync(file)
    return file
}

export function cli (args: string[]): Promise<Closeable> {
    return new Promise(function (resolve) {
        yargs(args).detectLocale(false).env('SG').demandCommand().recommendCommands().completion().strict()
            
            .command('inner-layer', 'Start the inner-layer', yargs => {
                return yargs
                    .option('identifier', {
                        description: 'The identifier to distinguish multiple inner layers',
                        default: hostname()
                    })
                    .option('private-key', {
                        description: 'The private key file used to authenticate against the outer layer',
                        demandOption: true,
                        coerce: readFileSync
                    })
                    .option('outer-layer', {
                        description: 'The outer layer URI to connect to',
                        demandOption: true,
                        coerce: coerceOuterLayer
                    })
            }, argv => resolve(new InnerLayer(argv)))

            .command('outer-layer', 'Start the outer-layer', yargs => {
                return yargs
                    .option('admin-password', {
                        description: 'The admin password',
                        type: 'string'
                    })
                    .option('trust-proxy', {
                        default: 'loopback, linklocal, uniquelocal'
                    })
                    .option('timeout', {
                        default: 10000
                    })
                    .option('validity', {
                        default: 1000
                    })
                    .option('app-port', {
                        description: 'The port the gateway consumers connect to',
                        default: 3000
                    })
                    .option('socket-port', {
                        description: 'The port the inner layer(s) connect to',
                        default: 3001
                    })
                    .option('public-key', {
                        description: 'The corresponsing public key or certificate file of the inner layer(s)',
                        demandOption: true,
                        coerce: readFileSync
                    })
                    .option('targets', {
                        description: 'The targets file',
                        demandOption: true,
                        coerce: coerceFileExists
                    })
            }, argv => resolve(new OuterLayer(argv)))

            .command('certificates', 'Generate certificates', yargs => {
                return yargs
                    .option('private-key', {
                        description: 'The private key file to write',
                        default: 'innerLayer.key'
                    }).option('public-key', {
                        description: 'The public key file to write',
                        default: 'innerLayer.crt'
                    })
            }, argv => {
                const keys = pki.rsa.generateKeyPair({ bits: 4096 })
                writeFileSync(argv['private-key'], pki.privateKeyToPem(keys.privateKey))
                writeFileSync(argv['public-key'], pki.publicKeyToPem(keys.publicKey))
                resolve({
                    close: () => { return }
                })
            }).argv
    })
}
