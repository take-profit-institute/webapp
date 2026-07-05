import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { getMarketProvider } from '../providers';
import { getMarketStatus } from '../data/market';
import { env } from '../config/env';
import { grpcGetIntradayTicks, grpcGetRankings } from '../grpc/market.grpc-client';
import { ErrorResponse } from '@candle/shared';
import {
  Candle,
  CandleQuery,
  IntradayHistory,
  MarketMovers,
  MarketStatus,
  NewsItem,
  Quote,
  Ranking,
  RankingQuery,
  StockDetail,
  StockListQuery,
  SymbolParams,
} from '@candle/shared';

const marketRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const provider = getMarketProvider();

  app.get(
    '/status',
    { schema: { tags: ['market'], summary: '장 운영 상태 (정규장/마감)', response: { 200: MarketStatus } } },
    async () => await getMarketStatus(),
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
    '/rankings',
    { schema: { tags: ['market'], summary: '트렌딩 랭킹 (급상승/급하락/거래량/인기/등락상하위)', querystring: RankingQuery, response: { 200: Ranking } } },
    async (req) => {
      // 캐시 miss(UNAVAILABLE) 등 상류 장애 시 화면을 막지 않도록 빈 결과로 폴백한다.
      try {
        return await grpcGetRankings(req.query.type, req.query.limit ?? 0);
      } catch (err) {
        req.log.warn({ err, type: req.query.type }, 'ranking fetch failed; returning empty');
        return { type: req.query.type, asOf: new Date().toISOString(), items: [] };
      }
    },
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
    async (req) => {
      const symbol = req.params.symbol;
      // grpc 모드: market-service(ka10079)에서 당일 틱 스냅샷을 당겨온다(장마감에도 그림).
      // 스냅샷이 비거나 실패하면 라이브 인메모리 버퍼(tick-store)로 폴백한다.
      if (env.dataSource === 'grpc') {
        try {
          const ticks = await grpcGetIntradayTicks(symbol);
          if (ticks.length > 0) return { symbol, ticks };
        } catch (err) {
          req.log.warn({ err }, 'intraday snapshot via market-service failed; falling back to tick buffer');
        }
      }
      return { symbol, ticks: app.tickStore.getHistory(symbol) };
    },
  );
};

export default marketRoutes;
