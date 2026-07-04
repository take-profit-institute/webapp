import { randomUUID } from 'crypto';
import fp from 'fastify-plugin';
import type { WebSocket } from '@fastify/websocket';
import type { WsConnected, WsQuoteUpdate } from '@candle/shared';
import { BFF_QUOTES_CHANNEL } from './market-channels';

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

  await app.pubsub.subscribe(BFF_QUOTES_CHANNEL, broadcast);

  const service: MarketStreamService = {
    addClient(socket) {
      clients.set(socket, new Set());
      const msg: WsConnected = { type: 'connected', data: { sessionId: randomUUID() } };
      socket.send(JSON.stringify(msg));
      socket.on('close', () => {
        // 소켓이 닫히면 이 소켓이 잡고 있던 모든 심볼의 뷰어 수요를 해제한다.
        const subs = clients.get(socket);
        clients.delete(socket);
        if (subs && subs.size) app.marketDemand.release([...subs]);
      });
    },

    subscribe(socket, symbols) {
      const subs = clients.get(socket);
      if (!subs) return;
      // 이 소켓에 새로 추가된 심볼만 데몬드 획득(중복 구독은 카운트 안 함).
      const added: string[] = [];
      for (const s of symbols) {
        if (!subs.has(s)) {
          subs.add(s);
          added.push(s);
        }
      }
      if (added.length) app.marketDemand.acquire(added);
    },

    unsubscribe(socket, symbols) {
      const subs = clients.get(socket);
      if (!subs) return;
      const removed: string[] = [];
      for (const s of symbols) {
        if (subs.has(s)) {
          subs.delete(s);
          removed.push(s);
        }
      }
      if (removed.length) app.marketDemand.release(removed);
    },
  };

  app.decorate('marketStream', service);
});
