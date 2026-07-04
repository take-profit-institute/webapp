import fp from 'fastify-plugin';
import type { IntradayTick, WsQuoteUpdate } from '@candle/shared';
import { BFF_QUOTES_CHANNEL } from './market-channels';

interface TickStoreService {
  getHistory(symbol: string): IntradayTick[];
  getLatest(symbol: string): IntradayTick | undefined;
}

declare module 'fastify' {
  interface FastifyInstance {
    tickStore: TickStoreService;
  }
}

const MAX_TICKS = 500; // ~8 min at 1 tick/sec; bump for production with 1-min aggregation

export default fp(async (app) => {
  const store = new Map<string, IntradayTick[]>();

  await app.pubsub.subscribe(BFF_QUOTES_CHANNEL, (raw) => {
    try {
      const msg = JSON.parse(raw) as WsQuoteUpdate;
      if (msg.type !== 'quote_update') return;
      const { symbol, price, timestamp } = msg.data;

      const ticks = store.get(symbol) ?? [];
      ticks.push({ price, timestamp });
      if (ticks.length > MAX_TICKS) ticks.shift();
      store.set(symbol, ticks);
    } catch { /* ignore */ }
  });

  app.decorate('tickStore', {
    getHistory: (symbol: string) => store.get(symbol) ?? [],
    getLatest: (symbol: string) => store.get(symbol)?.at(-1),
  });
});
