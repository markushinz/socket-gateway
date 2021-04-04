import { pki } from 'node-forge'

process.env.NODE_ENV = 'development'

if (process.env.SG_SOCKET_PORT) {
    process.env.SG_OUTER_LAYER = `ws://localhost:${process.env.SG_SOCKET_PORT}`
}

const keys = pki.rsa.generateKeyPair({ bits: 4096 })
process.env.SG_INNER_LAYER_PUBLIC_KEY = pki.publicKeyToPem(keys.publicKey)
process.env.SG_INNER_LAYER_PRIVATE_KEY = pki.privateKeyToPem(keys.privateKey)

import { appServer, socketServer } from './outer-layer/server'
import { client } from './inner-layer/server'

export { appServer, socketServer, client }
