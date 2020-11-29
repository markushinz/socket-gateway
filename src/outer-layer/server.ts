import http from 'http';

import Config from '../config';
import app from './app';
import { Gateway } from './socket';
import socketApp from './socketApp';

export const appServer = http.createServer(app);
export const socketServer = http.createServer(socketApp);
const gateway = new Gateway(socketServer);

app.set('port', Config.appPort);
app.set('gateway', gateway);
socketApp.set('port', Config.socketPort);
socketApp.set('gateway', gateway);

appServer.listen(Config.appPort);
console.log(`Listening on port ${Config.appPort}...`);

socketServer.listen(Config.socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${Config.socketPort}...`);
