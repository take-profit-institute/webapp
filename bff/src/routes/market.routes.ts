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

  // ── 외부 시세 프록시 (네이버 금융) ─────────────────────────────────
  // 정적 webapp(CloudFront)은 서버가 없고 브라우저 직접 호출은 CORS로 막히므로
  // BFF가 서버 사이드에서 프록시한다. (구 webapp Next /api/market-* 라우트 대체)
  app.get(
    '/indices',
    { schema: { tags: ['market'], summary: 'KOSPI/KOSDAQ 지수 (네이버 프록시)' } },
    async (req, reply) => {
      const codes = ['KOSPI', 'KOSDAQ'];
      try {
        const responses = await Promise.all(
          codes.map((code) =>
            fetch(`https://polling.finance.naver.com/api/realtime/domestic/index/${code}`, {
              headers: { Accept: 'application/json' },
            }),
          ),
        );
        if (responses.some((r) => !r.ok)) {
          return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message: '지수 제공처 응답 오류' });
        }
        const payloads = (await Promise.all(responses.map((r) => r.json()))) as Array<{ datas?: unknown[] }>;
        return { datas: payloads.flatMap((p) => p.datas ?? []) };
      } catch (err) {
        req.log.warn({ err }, 'naver indices proxy failed');
        return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message: '지수를 불러오지 못했습니다.' });
      }
    },
  );

  interface NaverStock {
    itemCode: string;
    stockName: string;
    closePriceRaw: string;
    compareToPreviousClosePriceRaw: string;
    fluctuationsRatio: string;
    accumulatedTradingVolumeRaw: string;
    marketValueRaw: string;
    stockExchangeType?: { name?: string };
  }

  app.get(
    '/market-value',
    {
      schema: {
        tags: ['market'],
        summary: '시가총액 상위 종목 (네이버 프록시)',
        querystring: Type.Object({
          market: Type.Optional(Type.String()),
          page: Type.Optional(Type.Integer({ minimum: 0 })),
          size: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
        }),
      },
    },
    async (req, reply) => {
      const q = req.query;
      const markets = q.market === 'KOSPI' || q.market === 'KOSDAQ' ? [q.market] : ['KOSPI', 'KOSDAQ'];
      const page = Math.max(0, q.page ?? 0);
      const size = Math.min(50, Math.max(1, q.size ?? 20));
      try {
        const responses = await Promise.all(
          markets.map((market) =>
            fetch(`https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page + 1}&pageSize=${size}`, {
              headers: { Accept: 'application/json' },
            }),
          ),
        );
        if (responses.some((r) => !r.ok)) {
          return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message: '종목 제공처 응답 오류' });
        }
        const payloads = (await Promise.all(responses.map((r) => r.json()))) as Array<{ stocks?: NaverStock[]; totalCount?: number }>;
        const stocks = payloads
          .flatMap((p) => p.stocks ?? [])
          .map((s) => ({
            code: s.itemCode,
            name: s.stockName,
            market: s.stockExchangeType?.name ?? '',
            price: Number(s.closePriceRaw),
            change: Number(s.compareToPreviousClosePriceRaw),
            changePercent: Number(s.fluctuationsRatio),
            volume: Number(s.accumulatedTradingVolumeRaw),
            marketCap: Number(s.marketValueRaw),
          }))
          .sort((a, b) => b.marketCap - a.marketCap)
          .slice(0, size);
        const totalElements = payloads.reduce((sum, p) => sum + (p.totalCount ?? 0), 0);
        return { items: stocks, totalElements, totalPages: Math.max(1, Math.ceil(totalElements / size)), page, size };
      } catch (err) {
        req.log.warn({ err }, 'naver market-value proxy failed');
        return reply.status(502).send({ statusCode: 502, error: 'Bad Gateway', message: '종목을 불러오지 못했습니다.' });
      }
    },
  );
};

export default marketRoutes;
