import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  getAccount,
  getPortfolioHistory,
  holdings,
  sectorAllocation,
  transactions,
} from '../data/account';
import { getMarketProvider } from '../providers';
import { ErrorResponse } from '@candle/shared';
import {
  Account,
  Holding,
  PlaceOrderBody,
  PortfolioHistoryQuery,
  PortfolioPoint,
  SectorAllocation,
  Transaction,
  TransactionQuery,
} from '@candle/shared';

const accountRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const provider = getMarketProvider();

  app.get(
    '/',
    { schema: { tags: ['account'], summary: '계좌 요약 (대시보드 통계)', response: { 200: Account } } },
    async () => getAccount(),
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
};

export default accountRoutes;
