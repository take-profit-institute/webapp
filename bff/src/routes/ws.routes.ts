import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { RawData } from 'ws';
import type { WsClientMessage } from '@candle/shared';

const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, (socket: WebSocket) => {
    app.marketStream.addClient(socket);

    socket.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsClientMessage;
        if (msg.type === 'subscribe') {
          app.marketStream.subscribe(socket, msg.symbols);
        } else if (msg.type === 'unsubscribe') {
          app.marketStream.unsubscribe(socket, msg.symbols);
        }
      } catch { /* ignore malformed client messages */ }
    });
  });
};

export default wsRoutes;
