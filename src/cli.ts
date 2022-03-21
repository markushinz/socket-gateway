import yargs from 'yargs'
import { compile } from 'proxy-addr'

import { hostname } from 'os'
import { readFileSync, writeFileSync } from 'fs'
import { InnerLayer } from './inner-layer'
import { OuterLayer } from './outer-layer'
import { pki, md } from 'node-forge'
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

function generateSerial() {
    const max = Math.pow(2, 32)
    let serial = ''
    for (let i = 0; i < 4; i++) {
        serial += Math.floor(Math.random() * Math.floor(max)).toString(16)
    }
    return '00' + serial.toUpperCase()
}

export function cli(args: string[]): Promise<Closeable> {
    return new Promise(function(resolve) {
        yargs(args).detectLocale(false).env('SG').demandCommand().recommendCommands().completion().strict()
            
            .command('inner-layer', 'Start the inner-layer', yargs_ => {
                return yargs_
                    .option('inner-layer-identifier', {
                        alias: 'identifier',
                        description: 'The identifier to distinguish multiple inner layers',
                        default: hostname()
                    })
                    .option('outer-layer-ca', {
                        type: 'string',
                        description: 'The outer layer certificate or CA file to check against. If not provided all well known CAs are accepted.',
                        coerce: ca => ca ? readFileSync(ca, 'utf-8') : undefined
                    })
                    .option('inner-layer-private-key', {
                        alias: 'private-key',
                        description: 'The private key file used to authenticate against the outer layer. The private key is used during a challenge-response authentication mechanism.',
                        demandOption: true,
                        coerce: key => readFileSync(key, 'utf-8')
                    })
                    .option('inner-layer-certificate', {
                        type: 'string',
                        description: 'The certificate file signed by the private key to use when establishing the TLS connection to the outer layer. Provide the certificate if you want to use client certificate authenticaion on top of the challenge-response authentication mechanism.',
                        coerce: certificate => certificate ? readFileSync(certificate, 'utf-8') : undefined
                    })
                    .option('outer-layer', {
                        description: 'The outer layer URI to connect to',
                        demandOption: true,
                        coerce: url => coerceOuterLayer(url, yargs_.argv.insecure as boolean)
                    })
                    .option('insecure', {
                        type: 'boolean',
                        description: 'Allow connections to the outer layer via http/ws',
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
                    .option('inner-layer-certificate', {
                        alias: 'public-key',
                        description: 'The corresponsing certificate file of the inner layer(s)',
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
                    }).option('certificate', {
                        alias: 'public-key',
                        description: 'The public key file to write',
                        default: 'innerLayer.crt'
                    })
                    .option('common-name', {
                        description: 'The common name of the certificate',
                        default: 'inner-layer'
                    })
                    .option('validity', {
                        description: 'The certificate validity in years',
                        default: 100
                    })
            }, argv => {
                const keys = pki.rsa.generateKeyPair({ bits: 4096 })
                const certificate = pki.createCertificate()
                certificate.publicKey = keys.publicKey
                certificate.serialNumber = generateSerial()
                certificate.validity.notBefore = new Date()
                certificate.validity.notAfter = new Date(certificate.validity.notBefore.getTime())
                certificate.validity.notAfter.setFullYear(certificate.validity.notBefore.getFullYear() + argv.validity)
                const subject = [{
                    name: 'commonName',
                    value: argv['common-name']
                }]
                certificate.setSubject(subject)
                certificate.setIssuer(subject)
                const extensions = [
                    {
                        name: 'basicConstraints',
                        critical: true,
                        cA: false
                    },
                    {
                        name: 'keyUsage',
                        digitalSignature: true,
                        keyEncipherment: true,
                        dataEncipherment: true,
                        critical: true
                    },
                    {
                        name: 'extKeyUsage',
                        clientAuth: true,
                        critical: true
                    }
                ]
                certificate.setExtensions(extensions)
                certificate.sign(keys.privateKey, md.sha256.create())

                writeFileSync(argv['private-key'], pki.privateKeyToPem(keys.privateKey))
                writeFileSync(argv['certificate'], pki.certificateToPem(certificate))
                resolve({
                    close: () => { return }
                })
            }).argv
    })
}
