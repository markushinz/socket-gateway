import { createServer } from 'http';

import app from './app';
import socketApp from './socketApp';
import { Gateway } from './gateway';
import { ChallengeTool } from './tools/challenge';

import Config from './config';

export const appServer = createServer(app);
export const socketServer = createServer(socketApp);
const gateway = new Gateway(socketServer, new ChallengeTool(Config.challengeValidity, Config.innerLayerPublicKey), Config.timeout);

app.set('port', Config.appPort);
app.set('gateway', gateway);
socketApp.set('port', Config.socketPort);
socketApp.set('gateway', gateway);

appServer.listen(Config.appPort);
console.log(`Listening on port ${Config.appPort}...`);

socketServer.listen(Config.socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${Config.socketPort}...`);
