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
import { getMarketStatus, getQuote } from '../data/market';
import { getMarketProvider } from '../providers';
import { ErrorResponse } from '@candle/shared';
import {
  Account,
  AccountBalance,
  AddWatchlistBody,
  Holding,
  OrderCancelResult,
  OrderIdParams,
  OrderListQuery,
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
import type { OrderKind } from '@candle/shared';

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

  // 모든 주문 = 예약(pending) + 체결(filled). 목록/상세 조회용 합성 뷰.
  const allOrders = (): Transaction[] =>
    [
      ...reservations.map((r) => ({ ...r, orderKind: 'limit' as OrderKind })),
      ...transactions.map((t) => ({ ...t, orderKind: 'market' as OrderKind })),
    ].sort((a, b) => b.executedAt.localeCompare(a.executedAt));

  app.get(
    '/orders',
    { schema: { tags: ['account'], summary: '주문 목록 조회 (ORD-004)', querystring: OrderListQuery, response: { 200: Type.Array(Transaction) } } },
    async (req) => {
      let result = allOrders();
      if (req.query.status) result = result.filter((o) => o.status === req.query.status);
      if (req.query.symbol) result = result.filter((o) => o.symbol === req.query.symbol);
      return result;
    },
  );

  app.get(
    '/orders/:id',
    { schema: { tags: ['account'], summary: '주문 상세 조회 (ORD-005)', params: OrderIdParams, response: { 200: Transaction, 404: ErrorResponse } } },
    async (req, reply) => {
      const order = allOrders().find((o) => o.id === req.params.id);
      if (!order) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown order: ${req.params.id}` });
      return order;
    },
  );

  app.post(
    '/orders',
    {
      schema: {
        tags: ['account'],
        summary: '매수/매도 주문 (시장가/지정가)',
        body: PlaceOrderBody,
        response: { 201: Transaction, 400: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse, 422: ErrorResponse },
      },
    },
    // NOTE: 주문은 영속화되지 않음 — 검증 후 체결/예약 결과를 합성해 반환.
    async (req, reply) => {
      const { type, quantity } = req.body;
      const orderKind: OrderKind = req.body.orderKind ?? 'market';

      const stock = await provider.getStock(req.body.symbol);
      if (!stock) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${req.body.symbol}` });
      }

      // ORD-003/011: 지정가는 가격 필수 + 정수만.
      if (orderKind === 'limit') {
        if (req.body.price == null) {
          return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '지정가 주문은 가격이 필요합니다.' });
        }
        if (!Number.isInteger(req.body.price)) {
          return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '지정가는 1원 단위(정수)만 가능합니다.' });
        }
      }

      const price = orderKind === 'limit' ? req.body.price! : stock.price;
      const amount = price * quantity;
      const fee = Math.round(amount * 0.00015);

      // ORD-009: 동일 종목의 PENDING 주문이 있으면 거부.
      if (reservations.some((r) => r.symbol === stock.symbol && r.status === 'pending')) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '해당 종목에 이미 대기 중인 주문이 있습니다.' });
      }

      // ORD-007: 매수 가용 잔고 검증.
      if (type === 'buy' && amount + fee > getAccount().cash) {
        return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: '가용 가능 금액이 부족합니다.' });
      }
      // ORD-008: 매도 보유 수량 검증.
      if (type === 'sell') {
        const held = holdings.find((h) => h.symbol === stock.symbol)?.quantity ?? 0;
        if (quantity > held) {
          return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: `보유 수량(${held}주)을 초과했습니다.` });
        }
      }

      // ORD-012: 지정가이거나 장 마감이면 예약(pending), 정규장 시장가면 즉시 체결(filled).
      const status = orderKind === 'limit' || !getMarketStatus().open ? 'pending' : 'filled';

      const order: Transaction = {
        id: `t_${Date.now()}`,
        type,
        orderKind,
        symbol: stock.symbol,
        name: stock.name,
        quantity,
        price,
        amount,
        fee,
        status,
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
