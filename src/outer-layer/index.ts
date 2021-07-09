import { createServer, Server } from 'http'

import { NewApp } from './app'
import { NewSocketApp } from './socketApp'
import { Gateway } from './gateway'
import { ChallengeTool } from './tools/challenge'

import { OuterLayerConfig } from './config'
import { Closeable } from '../models'

export class OuterLayer implements Closeable {
    appServer: Server
    socketServer: Server

    constructor(config: OuterLayerConfig) {
        const app = NewApp(config)
        const socketApp = NewSocketApp(config)

        this.appServer = createServer(app)
        this.socketServer = createServer(socketApp)
        const gateway = new Gateway(this.socketServer, new ChallengeTool(config.validity, config.publicKey), config.timeout)

        app.set('port', config.appPort)
        app.set('gateway', gateway)
        socketApp.set('port', config.socketPort)
        socketApp.set('gateway', gateway)

        this.appServer.listen(config.appPort)
        console.log(`Listening on port ${config.appPort}...`)

        this.socketServer.listen(config.socketPort)
        console.log(`Awaiting connections from inner layer(s) on port ${config.socketPort}...`)
    }

    close(): void {
        this.appServer.close()
        this.socketServer.close()
    }
}
