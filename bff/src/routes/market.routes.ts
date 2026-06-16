import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { getMarketProvider } from '../providers';
import { ErrorResponse } from '@candle/shared';
import {
  Candle,
  CandleQuery,
  MarketMovers,
  NewsItem,
  Quote,
  StockDetail,
  StockListQuery,
  SymbolParams,
} from '@candle/shared';

const marketRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const provider = getMarketProvider();

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
};

export default marketRoutes;
