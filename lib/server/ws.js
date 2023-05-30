import { WebSocketServer } from 'ws';

export async function createWsServer() {

    const server = new WebSocketServer({ noServer: true });

    return server;
}

export default {
    createWsServer
};

