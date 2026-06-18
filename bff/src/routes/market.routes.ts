import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { getMarketProvider } from '../providers';
import { getMarketStatus } from '../data/market';
import { ErrorResponse } from '@candle/shared';
import {
  Candle,
  CandleQuery,
  IntradayHistory,
  MarketMovers,
  MarketStatus,
  NewsItem,
  Quote,
  StockDetail,
  StockListQuery,
  SymbolParams,
} from '@candle/shared';

const marketRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const provider = getMarketProvider();

  app.get(
    '/status',
    { schema: { tags: ['market'], summary: '장 운영 상태 (정규장/마감)', response: { 200: MarketStatus } } },
    async () => getMarketStatus(),
  );

  app.get(
    '/stocks',
    { schema: { tags: ['market'], summary: '종목 목록/검색', querystring: StockListQuery, response: { 200: Type.Array(Quote) } } },
    async (req) => provider.listStocks(req.query),
  );

  app.get(
    '/movers',
    { schema: { tags: ['market'], summary: '시장 동향 (상승/하락/거래상위)', response: { 200: MarketMovers } } },
    async () => provider.getMovers(),
  );

  app.get(
    '/stocks/:symbol',
    { schema: { tags: ['market'], summary: '종목 상세', params: SymbolParams, response: { 200: StockDetail, 404: ErrorResponse } } },
    async (req, reply) => {
      const stock = await provider.getStock(req.params.symbol);
      if (!stock) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${req.params.symbol}` });
      }
      return stock;
    },
  );

  app.get(
    '/stocks/:symbol/candles',
    { schema: { tags: ['market'], summary: '캔들(OHLCV) 데이터', params: SymbolParams, querystring: CandleQuery, response: { 200: Type.Array(Candle) } } },
    async (req) => {
      const { interval = '1d', limit = 60 } = req.query;
      return provider.getCandles(req.params.symbol, interval, limit);
    },
  );

  app.get(
    '/stocks/:symbol/news',
    { schema: { tags: ['market'], summary: '종목 뉴스', params: SymbolParams, response: { 200: Type.Array(NewsItem) } } },
    async (req) => provider.getNews(req.params.symbol),
  );

  app.get(
    '/sparklines',
    {
      schema: {
        tags: ['market'],
        summary: '전 종목 2주 스파크라인 (일봉 종가 배열)',
        querystring: Type.Object({ limit: Type.Optional(Type.Integer({ minimum: 1, default: 14 })) }),
        response: { 200: Type.Record(Type.String(), Type.Array(Type.Number())) },
      },
    },
    async (req) => {
      const limit = req.query.limit ?? 14;
      const allStocks = await provider.listStocks({});
      const result: Record<string, number[]> = {};
      for (const stock of allStocks) {
        const candles = await provider.getCandles(stock.symbol, '1d', limit);
        result[stock.symbol] = candles.map((c) => c.close);
      }
      return result;
    },
  );

  app.get(
    '/stocks/:symbol/intraday',
    { schema: { tags: ['market'], summary: '당일 실시간 틱 히스토리', params: SymbolParams, response: { 200: IntradayHistory } } },
    async (req) => ({
      symbol: req.params.symbol,
      ticks: app.tickStore.getHistory(req.params.symbol),
    }),
  );
};

export default marketRoutes;
