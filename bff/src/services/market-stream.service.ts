import { randomUUID } from 'crypto';
import fp from 'fastify-plugin';
import type { WebSocket } from '@fastify/websocket';
import type { WsConnected, WsQuoteUpdate } from '@candle/shared';

interface MarketStreamService {
  addClient(socket: WebSocket): void;
  subscribe(socket: WebSocket, symbols: string[]): void;
  unsubscribe(socket: WebSocket, symbols: string[]): void;
}

declare module 'fastify' {
  interface FastifyInstance {
    marketStream: MarketStreamService;
  }
}

export default fp(async (app) => {
  // symbol → null means "subscribed to all". For now we use an explicit Set per client.
  const clients = new Map<WebSocket, Set<string>>();

  function broadcast(rawMessage: string) {
    try {
      const msg = JSON.parse(rawMessage) as WsQuoteUpdate;
      if (msg.type !== 'quote_update') return;
      const { symbol } = msg.data;

      for (const [socket, subs] of clients) {
        if (socket.readyState !== 1 /* OPEN */) continue;
        if (subs.has(symbol)) socket.send(rawMessage);
      }
    } catch { /* ignore malformed messages */ }
  }

  await app.pubsub.subscribe('market:quotes', broadcast);

  const service: MarketStreamService = {
    addClient(socket) {
      clients.set(socket, new Set());
      const msg: WsConnected = { type: 'connected', data: { sessionId: randomUUID() } };
      socket.send(JSON.stringify(msg));
      socket.on('close', () => clients.delete(socket));
    },

    subscribe(socket, symbols) {
      const subs = clients.get(socket);
      if (subs) symbols.forEach((s) => subs.add(s));
    },

    unsubscribe(socket, symbols) {
      const subs = clients.get(socket);
      if (subs) symbols.forEach((s) => subs.delete(s));
    },
  };

  app.decorate('marketStream', service);
});
