import http from 'http';

import { appPort, socketPort } from './config';
import app from './app';
import { createGateway } from './socket';
import socketApp from './socketApp';

export const appServer = http.createServer(app);
export const socketServer = http.createServer(socketApp);
const gateway = createGateway(socketServer);

app.set('port', appPort);
app.set('gateway', gateway);
socketApp.set('port', socketPort);

appServer.listen(appPort);
console.log(`Listening on port ${appPort}...`);

socketServer.listen(socketPort);
console.log(`Awaiting connections from inner layer(s) on port ${socketPort}...`);
