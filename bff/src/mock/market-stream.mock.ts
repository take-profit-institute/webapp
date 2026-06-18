import fp from 'fastify-plugin';
import type { WsQuoteUpdate } from '@candle/shared';
import { env } from '../config/env';

const MOCK_STOCKS = [
  { symbol: '005930', price: 71400 },
  { symbol: '000660', price: 198500 },
  { symbol: '373220', price: 312000 },
  { symbol: '005380', price: 215500 },
  { symbol: '035420', price: 168000 },
  { symbol: '035720', price: 39450 },
  { symbol: '068270', price: 182000 },
  { symbol: '247540', price: 128500 },
];

export default fp(async (app) => {
  if (env.dataSource !== 'mock') return;

  const basePrices = Object.fromEntries(MOCK_STOCKS.map(({ symbol, price }) => [symbol, price]));
  const current = { ...basePrices };

  const interval = setInterval(async () => {
    const stock = MOCK_STOCKS[Math.floor(Math.random() * MOCK_STOCKS.length)];
    const prev = current[stock.symbol];
    // ±0.15% tick per second — realistic intraday drift
    const newPrice = Math.round(prev * (1 + (Math.random() - 0.5) * 0.003));
    current[stock.symbol] = newPrice;

    const change = newPrice - basePrices[stock.symbol];
    const changePercent = Math.round((change / basePrices[stock.symbol]) * 10_000) / 100;

    const msg: WsQuoteUpdate = {
      type: 'quote_update',
      data: {
        symbol: stock.symbol,
        price: newPrice,
        change,
        changePercent,
        volume: Math.floor(Math.random() * 500_000 + 100_000),
        timestamp: new Date().toISOString(),
      },
    };

    await app.pubsub.publish('market:quotes', JSON.stringify(msg));
  }, 1000);

  app.addHook('onClose', async () => clearInterval(interval));
  app.log.info('Mock market stream started (1 s tick)');
});
