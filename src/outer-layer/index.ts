import { createServer, Server } from 'http'

import { NewApp } from './app'
import { NewSocketApp } from './socketApp'
import { Gateway } from './gateway'
import { ChallengeTool } from './tools/challenge'

import { Closeable } from '../models'
import { EvaluateTool } from './tools/evaluate'
import { RewriteTool } from './tools/rewrite'

export type OuterLayerConfig = {
    'admin-password'?: string;
    'trust-proxy': (addr: string, i: number) => boolean;
    timeout: number;
    validity: number;
    'app-port': number;
    'socket-port': number;
    'inner-layer-certificate': string | Buffer;
    targets: string;
    'remove-csps': boolean;
}

export class OuterLayer implements Closeable {
    appServer: Server
    socketServer: Server

    constructor(config: OuterLayerConfig) {
        const challegeTool = new ChallengeTool(config.validity, config['inner-layer-certificate'])
        const evaluateTool = new EvaluateTool(config.targets)
        const rewriteTool = new RewriteTool(config['remove-csps'])

        const gateway = new Gateway(challegeTool, rewriteTool, config.timeout)

        const socketApp = NewSocketApp(config, gateway, evaluateTool)
        this.socketServer = createServer(socketApp)
        gateway.attach(this.socketServer)


        const app = NewApp(config, gateway, evaluateTool, rewriteTool)
        this.appServer = createServer(app)

        this.appServer.listen(config['app-port'])
        console.log(`Listening on port ${config['app-port']}...`)

        this.socketServer.listen(config['socket-port'])
        console.log(`Awaiting connections from inner layer(s) on port ${config['socket-port']}...`)
    }

    close(): void {
        this.appServer.close()
        this.socketServer.close()
    }
}
