import yargs from 'yargs'
import { compile } from 'proxy-addr'

import { hostname } from 'os'
import { readFileSync, writeFileSync } from 'fs'
import { InnerLayer } from './inner-layer'
import { OuterLayer } from './outer-layer'
import { pki } from 'node-forge'
import { Closeable } from './models'

function coerceOuterLayer(url: string, insecure: boolean): URL {
    const parsed = new URL(url)
    if (
        insecure ||
        ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || 
        ['https:', 'wss:'].includes(parsed.protocol)
    ) {
        return parsed
    }
    throw new Error('Protocol must be https: or wss:')
}

function coerceFileExists(file: string) {
    readFileSync(file)
    return file
}

function coerceTrustProxy(values: string) {
    return compile(values ? values.split(',').map(value => value.trim()) : [])
}

export function cli(args: string[]): Promise<Closeable> {
    return new Promise(function(resolve) {
        yargs(args).detectLocale(false).env('SG').demandCommand().recommendCommands().completion().strict()
            
            .command('inner-layer', 'Start the inner-layer', yargs_ => {
                return yargs_
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
                        coerce: url => coerceOuterLayer(url, yargs_.argv.insecure as boolean)
                    })
                    .option('insecure', {
                        type: 'boolean',
                        description: 'Allow connections via http/ws',
                        default: false
                    })
            }, argv => resolve(new InnerLayer(argv)))

            .command('outer-layer', 'Start the outer-layer', yargs_ => {
                return yargs_
                    .option('admin-password', {
                        description: 'The admin password',
                        type: 'string'
                    })
                    .option('trust-proxy', {
                        default: 'loopback, linklocal, uniquelocal',
                        coerce: coerceTrustProxy
                    })
                    .option('timeout', {
                        default: 180000
                    })
                    .option('validity', {
                        default: 1000
                    })
                    .option('remove-csps', {
                        type: 'boolean',
                        description: 'Removes content-security-policy response headers',
                        default: false
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

            .command('certificates', 'Generate certificates', yargs_ => {
                return yargs_
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
