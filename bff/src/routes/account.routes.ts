import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  getAccount,
  getBalance,
  getDeactivatedAccount,
  getPortfolioHistory,
  getResetAccount,
  holdings,
  reservations,
  sectorAllocation,
  transactions,
  watchlistSymbols,
} from '../data/account';
import { getQuote } from '../data/market';
import { getMarketProvider } from '../providers';
import { ErrorResponse } from '@candle/shared';
import {
  Account,
  AccountBalance,
  AddWatchlistBody,
  Holding,
  OrderCancelResult,
  PlaceOrderBody,
  PortfolioHistoryQuery,
  PortfolioPoint,
  Quote,
  SectorAllocation,
  Transaction,
  TransactionQuery,
  WatchlistItem,
  WatchlistSymbolParams,
} from '@candle/shared';

const accountRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const provider = getMarketProvider();

  app.get(
    '/',
    { schema: { tags: ['account'], summary: '계좌 요약 (대시보드 통계)', response: { 200: Account } } },
    async () => getAccount(),
  );

  app.get(
    '/balance',
    { schema: { tags: ['account'], summary: '잔고 분리 조회 (총/묶인/가용)', response: { 200: AccountBalance } } },
    async () => getBalance(),
  );

  app.get(
    '/reservations',
    { schema: { tags: ['account'], summary: '예약(미체결) 주문 — 묶인 금액 내역', response: { 200: Type.Array(Transaction) } } },
    async () => reservations,
  );

  app.get(
    '/holdings',
    { schema: { tags: ['account'], summary: '보유 종목', response: { 200: Type.Array(Holding) } } },
    async () => holdings,
  );

  app.get(
    '/transactions',
    { schema: { tags: ['account'], summary: '거래 내역', querystring: TransactionQuery, response: { 200: Type.Array(Transaction) } } },
    async (req) => {
      let result = transactions;
      if (req.query.type) result = result.filter((t) => t.type === req.query.type);
      if (req.query.limit) result = result.slice(0, req.query.limit);
      return result;
    },
  );

  app.get(
    '/portfolio-history',
    { schema: { tags: ['account'], summary: '포트폴리오 자산 추이', querystring: PortfolioHistoryQuery, response: { 200: Type.Array(PortfolioPoint) } } },
    async (req) => getPortfolioHistory(req.query.days ?? 30),
  );

  app.get(
    '/allocation',
    { schema: { tags: ['account'], summary: '섹터별 자산 구성', response: { 200: Type.Array(SectorAllocation) } } },
    async () => sectorAllocation,
  );

  app.post(
    '/orders',
    { schema: { tags: ['account'], summary: '매수/매도 주문 (모의 체결)', body: PlaceOrderBody, response: { 201: Transaction, 404: ErrorResponse } } },
    async (req, reply) => {
      const stock = await provider.getStock(req.body.symbol);
      if (!stock) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${req.body.symbol}` });
      }
      const price = req.body.price ?? stock.price;
      const amount = price * req.body.quantity;
      // NOTE: orders are not persisted yet — this just simulates an immediate fill.
      const order: Transaction = {
        id: `t_${Date.now()}`,
        type: req.body.type,
        symbol: stock.symbol,
        name: stock.name,
        quantity: req.body.quantity,
        price,
        amount,
        fee: Math.round(amount * 0.00015),
        status: 'filled',
        executedAt: new Date().toISOString(),
      };
      return reply.status(201).send(order);
    },
  );

  app.delete(
    '/orders/:id',
    { schema: { tags: ['account'], summary: '주문 취소', params: Type.Object({ id: Type.String() }), response: { 200: OrderCancelResult } } },
    // NOTE: orders aren't stored yet — echoes the id back as cancelled.
    async (req) => ({ id: req.params.id, status: 'cancelled' as const, cancelledAt: new Date().toISOString() }),
  );

  app.post(
    '/reset',
    { schema: { tags: ['account'], summary: '계정 초기화 (포트폴리오 리셋)', response: { 200: Account } } },
    // NOTE: mock — returns a fresh starting-capital account without persisting.
    async () => getResetAccount(),
  );

  app.post(
    '/deactivate',
    { schema: { tags: ['account'], summary: '계좌 비활성화 (Auth 탈퇴 이벤트 처리)', response: { 200: Account } } },
    // NOTE: mock — real deactivation is triggered by an Auth 탈퇴 event in the Account service.
    async () => getDeactivatedAccount(),
  );

  app.get(
    '/watchlist',
    { schema: { tags: ['account'], summary: '관심종목 목록', response: { 200: Type.Array(Quote) } } },
    async () => watchlistSymbols.map((s) => getQuote(s)).filter((q): q is NonNullable<typeof q> => Boolean(q)),
  );

  app.post(
    '/watchlist',
    { schema: { tags: ['account'], summary: '관심종목 추가', body: AddWatchlistBody, response: { 201: WatchlistItem, 404: ErrorResponse } } },
    async (req, reply) => {
      const quote = getQuote(req.body.symbol);
      if (!quote) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${req.body.symbol}` });
      }
      // NOTE: not persisted — confirms the add and echoes the resolved item.
      return reply.status(201).send({ symbol: quote.symbol, name: quote.name, addedAt: new Date().toISOString() });
    },
  );

  app.delete(
    '/watchlist/:symbol',
    { schema: { tags: ['account'], summary: '관심종목 제거', params: WatchlistSymbolParams, response: { 204: Type.Null() } } },
    async (_req, reply) => reply.status(204).send(null),
  );
};

export default accountRoutes;
