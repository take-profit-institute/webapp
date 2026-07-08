import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  allowedReservationKinds,
  applyFilledOrderToHoldings,
  demoReservations,
  getAccount,
  getBalance,
  getDeactivatedAccount,
  getPortfolioHistory,
  getResetAccount,
  holdings,
  recalcHolding,
  reservations,
  resolveScheduledDate,
  sectorAllocation,
  transactions,
  watchlistSymbols,
  addWatchlistSymbol,
  removeWatchlistSymbol,
  WATCHLIST_LIMIT,
} from '../data/account';
import { getMarketStatus, getQuote } from '../data/market';
import { getMarketProvider } from '../providers';
import { requireIdempotencyKey, mapGrpcError } from '../grpc';
import { env } from '../config/env';
import {
  grpcPlaceOrder,
  grpcCancelOrder,
  grpcAmendOrder,
  grpcListOrders,
  grpcGetBalance,
  grpcListReservations,
  grpcPlaceReservation,
  grpcCancelReservation,
  grpcAmendReservation,
} from '../grpc/trading.grpc-client';
import {
  grpcGetAccountSummary,
  grpcListHoldings,
  grpcGetHolding,
  grpcGetPortfolioHistory,
  grpcGetSectorAllocation,
  type PriceResolver,
} from '../grpc/portfolio.grpc-client';
import { grpcBatchQuotes } from '../grpc/market.grpc-client';
import {
  grpcListWatchlist,
  grpcAddWatchlist,
  grpcRemoveWatchlist,
} from '../grpc/wishlist.grpc-client';

/** 게이트웨이가 JWT 검증 후 주입한 X-Account-Id 헤더로 actor 추출. */
function resolveActor(req: { headers: Record<string, unknown> }): string {
  const header = req.headers['x-account-id'];
  return typeof header === 'string' && header ? header : 'demo-user';
}
import { ErrorResponse } from '@candle/shared';
import {
  Account,
  AccountBalance,
  AccountPositions,
  AddWatchlistBody,
  AmendOrderBody,
  AmendReservationBody,
  CreateReservationBody,
  Holding,
  HoldingListQuery,
  HoldingSymbolParams,
  OrderCancelResult,
  OrderIdParams,
  OrderListQuery,
  PlaceOrderBody,
  PortfolioHistoryQuery,
  PortfolioPoint,
  Quote,
  Reservation,
  ReservationIdParams,
  ReservationListQuery,
  SectorAllocation,
  Transaction,
  TransactionQuery,
  WatchlistItem,
  WatchlistSymbolParams,
} from '@candle/shared';
import type { OrderKind, Reservation as SharedReservation } from '@candle/shared';

const ORDER_PRICE_TICK_MAX_AGE_MS = 10 * 60 * 1000;

const accountRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const provider = getMarketProvider();

  // 보유 종목 평가금액 계산용 현재가 resolver. grpc 모드에서 portfolio 보유목록과 머지한다.
  const resolvePrice: PriceResolver = async (symbol) => (await provider.getStock(symbol))?.price;
  const resolvePrices = async (symbols: string[]): Promise<Map<string, number>> => {
    if (env.dataSource !== 'grpc') return new Map();
    try {
      return await grpcBatchQuotes(symbols);
    } catch {
      return new Map();
    }
  };

  async function resolveOrderPrice(
    symbol: string,
    orderKind: OrderKind,
    clientPrice: number | undefined,
  ): Promise<{ price: number } | { error: { statusCode: 400 | 404 | 503; error: string; message: string } }> {
    if (orderKind === 'limit') {
      if (clientPrice == null) {
        return { error: { statusCode: 400, error: 'Bad Request', message: '지정가 주문은 가격이 필요합니다.' } };
      }
      if (!Number.isInteger(clientPrice) || clientPrice < 1) {
        return { error: { statusCode: 400, error: 'Bad Request', message: '지정가는 1원 단위(정수)만 가능합니다.' } };
      }
      return { price: clientPrice };
    }

    const latestTick = app.tickStore.getLatest(symbol);
    if (latestTick) {
      const tickAge = Date.now() - Date.parse(latestTick.timestamp);
      if (Number.isFinite(latestTick.price) && latestTick.price >= 1 && tickAge >= 0 && tickAge <= ORDER_PRICE_TICK_MAX_AGE_MS) {
        return { price: latestTick.price };
      }
    }

    const stock = await provider.getStock(symbol);
    if (!stock) {
      return { error: { statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${symbol}` } };
    }
    if (!Number.isFinite(stock.price) || stock.price < 1) {
      return {
        error: {
          statusCode: 503,
          error: 'Service Unavailable',
          message: '현재가를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.',
        },
      };
    }
    return { price: stock.price };
  }

  function nextScheduledDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  function reservationToPendingTransaction(reservation: SharedReservation, fallbackPrice: number): Transaction {
    const price = reservation.price ?? fallbackPrice;
    const amount = price * reservation.quantity;
    return {
      id: reservation.id,
      type: reservation.type,
      orderKind: reservation.orderKind === 'limit' ? 'limit' : 'market',
      symbol: reservation.symbol,
      name: reservation.name,
      quantity: reservation.quantity,
      price,
      amount,
      fee: reservation.fee,
      status: 'pending',
      executedAt: reservation.createdAt,
    };
  }

  async function resolveReservationPrice(
    symbol: string,
    timing: 'open' | 'prev_close' | 'today_close',
    orderKind: 'market' | 'limit' | 'after_hours_close',
    clientPrice: number | undefined,
  ): Promise<{ price: number } | { error: { statusCode: 400 | 404 | 503; error: string; message: string } }> {
    if (orderKind === 'limit') return resolveOrderPrice(symbol, 'limit', clientPrice);
    if (orderKind === 'market') return { price: 0 };

    const stock = await provider.getStock(symbol);
    if (!stock) {
      return { error: { statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${symbol}` } };
    }
    const price = timing === 'prev_close' ? stock.prevClose : stock.price;
    if (!Number.isFinite(price) || price < 1) {
      return {
        error: {
          statusCode: 503,
          error: 'Service Unavailable',
          message: timing === 'prev_close'
            ? '전일종가를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.'
            : '시간외종가를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.',
        },
      };
    }
    return { price };
  }

  app.get(
    '/',
    { schema: { tags: ['account'], summary: '계좌 요약 (대시보드 통계)', response: { 200: Account, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          return await grpcGetAccountSummary(resolveActor(req));
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      return getAccount();
    },
  );

  app.get(
    '/balance',
    { schema: { tags: ['account'], summary: '잔고 분리 조회 (총/묶인/가용)', response: { 200: AccountBalance, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          return await grpcGetBalance(resolveActor(req));
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      return getBalance();
    },
  );

  app.get(
    '/locked',
    { schema: { tags: ['account'], summary: '묶인 금액 내역 (미체결 지정가 주문)', response: { 200: Type.Array(Transaction) } } },
    async () => reservations.filter((r) => r.status === 'pending'),
  );

  app.get(
    '/holdings',
    { schema: { tags: ['account'], summary: '보유 종목 조회 (HLD-002/HLD-010/HLD-012)', querystring: HoldingListQuery, response: { 200: Type.Array(Holding), 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          return await grpcListHoldings(resolveActor(req), req.query.includeInactive ?? false, {
            resolvePrice,
            resolvePrices,
          });
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      return holdings
        .filter((h) => req.query.includeInactive || h.isActive)
        .map((h) => {
          const quote = getQuote(h.symbol);
          return recalcHolding(h, quote?.price ?? h.currentPrice);
        });
    },
  );

  // 포트폴리오 화면 조립(BFF): 실보유 + 예약(대기) 포지션을 함께 내려준다.
  // 예약은 TradingService가 소유하므로 여기서 복제하지 않고 ListReservations(RESERVED)를
  // 병합만 한다. 시장가 예약은 체결가 미정이라 현재가로 예상금액을 추정한다(표시 전용).
  app.get(
    '/positions',
    { schema: { tags: ['account'], summary: '포트폴리오 포지션(보유+예약 대기) 조립', response: { 200: AccountPositions, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          const userId = resolveActor(req);
          const [holdingsList, reservations] = await Promise.all([
            grpcListHoldings(userId, false, { resolvePrice, resolvePrices }),
            grpcListReservations({ userId, status: 'reserved' }),
          ]);
          const reserved = await Promise.all(
            reservations.map(async (r) => {
              const stock = await provider.getStock(r.symbol);
              const unitPrice = r.price ?? stock?.price ?? 0;
              return {
                reservationId: r.id,
                symbol: r.symbol,
                name: stock?.name ?? r.symbol,
                side: r.type,
                timing: r.timing,
                orderKind: r.orderKind,
                quantity: r.quantity,
                price: r.price,
                estimatedAmount: Math.round(unitPrice * r.quantity),
                scheduledDate: r.scheduledDate,
                status: 'reserved' as const,
              };
            }),
          );
          return { holdings: holdingsList, reserved };
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      // mock: 활성 보유 + reserved 예약
      const mockHoldings = holdings
        .filter((h) => h.isActive)
        .map((h) => recalcHolding(h, getQuote(h.symbol)?.price ?? h.currentPrice));
      const mockReserved = demoReservations
        .filter((r) => r.status === 'reserved')
        .map((r) => {
          const unitPrice = r.price ?? getQuote(r.symbol)?.price ?? 0;
          return {
            reservationId: r.id,
            symbol: r.symbol,
            name: r.name,
            side: r.type,
            timing: r.timing,
            orderKind: r.orderKind,
            quantity: r.quantity,
            price: r.price,
            estimatedAmount: Math.round(unitPrice * r.quantity),
            scheduledDate: r.scheduledDate,
            status: 'reserved' as const,
          };
        });
      return { holdings: mockHoldings, reserved: mockReserved };
    },
  );

  app.get(
    '/holdings/:symbol',
    { schema: { tags: ['account'], summary: '보유 종목 상세 조회 (HLD-003/HLD-011)', params: HoldingSymbolParams, response: { 200: Holding, 404: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          const holding = await grpcGetHolding(resolveActor(req), req.params.symbol, resolvePrice);
          if (!holding) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown holding: ${req.params.symbol}` });
          return holding;
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 404 | 500 | 503 | 504).send(mapped);
        }
      }
      const holding = holdings.find((h) => h.symbol === req.params.symbol);
      if (!holding) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown holding: ${req.params.symbol}` });
      const quote = getQuote(holding.symbol);
      return recalcHolding(holding, quote?.price ?? holding.currentPrice);
    },
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
    { schema: { tags: ['account'], summary: '포트폴리오 자산 추이', querystring: PortfolioHistoryQuery, response: { 200: Type.Array(PortfolioPoint), 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          return await grpcGetPortfolioHistory(resolveActor(req), req.query.days ?? 30);
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      return getPortfolioHistory(req.query.days ?? 30);
    },
  );

  app.get(
    '/allocation',
    { schema: { tags: ['account'], summary: '섹터별 자산 구성', response: { 200: Type.Array(SectorAllocation), 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          return await grpcGetSectorAllocation(resolveActor(req));
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      return sectorAllocation;
    },
  );

  // 모든 주문 = 예약(pending) + 체결(filled). 목록/상세 조회용 합성 뷰.
  const allOrders = (): Transaction[] =>
    [
      ...reservations.map((r) => ({ ...r, orderKind: r.orderKind ?? ('limit' as OrderKind) })),
      ...transactions.map((t) => ({ ...t, orderKind: 'market' as OrderKind })),
    ].sort((a, b) => b.executedAt.localeCompare(a.executedAt));

  app.get(
    '/orders',
    { schema: { tags: ['account'], summary: '주문 목록 조회 (ORD-004)', querystring: OrderListQuery, response: { 200: Type.Array(Transaction), 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          // OrderService.ListOrders엔 종목 필터가 없어 symbol은 BFF에서 후처리한다.
          const list = await grpcListOrders({ userId: resolveActor(req), status: req.query.status });
          return req.query.symbol ? list.filter((o) => o.symbol === req.query.symbol) : list;
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
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
        response: {
          201: Transaction,
          400: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
          504: ErrorResponse,
        },
      },
    },
    // NOTE: 주문은 영속화되지 않음 — 검증 후 체결/예약 결과를 합성해 반환.
    async (req, reply) => {
      // 쓰기 요청: 클라이언트가 보낸 Idempotency-Key를 검증한다(누락/형식오류 → 400).
      // gRPC 전환 시: grpc.account.placeOrder(body, { idempotencyKey, userId, requestId: req.id })
      // → 인터셉터가 metadata로, withCommandMetadata()가 command_metadata로 같은 값을 주입.
      const idempotencyKey = requireIdempotencyKey(req);
      req.log.debug({ idempotencyKey }, 'order idempotency key accepted');

      // 실제 gRPC 경로 — TradingService.PlaceOrder (멱등성 키를 metadata+command_metadata로 전파).
      if (env.dataSource === 'grpc') {
        try {
          const orderKind: OrderKind = req.body.orderKind ?? 'market';
          const resolved = await resolveOrderPrice(req.body.symbol, orderKind, req.body.price);
          if ('error' in resolved) return reply.code(resolved.error.statusCode).send(resolved.error);
          // 장 마감 중 즉시 주문은 시장가·지정가 모두 다음 개장(09:00) 예약으로 접수한다.
          // 프론트가 이 경우 버튼을 "예약"으로 표기하므로 지정가도 동일하게 변환해야 한다.
          // (지정가만 즉시 PlaceOrder로 보내면 trading이 OUTSIDE_TRADING_HOURS → 422로 거부.)
          if (!(await getMarketStatus()).open) {
            const reservationPrice = orderKind === 'limit' ? resolved.price : 0;
            const reservation = await grpcPlaceReservation({
              userId: resolveActor(req),
              symbol: req.body.symbol,
              type: req.body.type,
              timing: 'open',
              orderKind,
              quantity: req.body.quantity,
              price: reservationPrice,
              scheduledDate: nextScheduledDate(),
              idempotencyKey,
            });
            return reply.status(201).send(reservationToPendingTransaction(reservation, resolved.price));
          }
          const tx = await grpcPlaceOrder({
            userId: resolveActor(req),
            symbol: req.body.symbol,
            type: req.body.type,
            orderKind,
            quantity: req.body.quantity,
            price: resolved.price,
            idempotencyKey,
          });
          return reply.status(201).send(tx);
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 400 | 404 | 409 | 422 | 500 | 503 | 504).send(mapped);
        }
      }

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
        const held = holdings.find((h) => h.symbol === stock.symbol && h.isActive)?.quantity ?? 0;
        if (quantity > held) {
          return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: `보유 수량(${held}주)을 초과했습니다.` });
        }
      }

      // ORD-012: 지정가이거나 장 마감이면 예약(pending), 정규장 시장가면 즉시 체결(filled).
      const status = orderKind === 'limit' || !(await getMarketStatus()).open ? 'pending' : 'filled';

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
      if (status === 'pending') reservations.unshift(order);
      else {
        transactions.unshift(order);
        applyFilledOrderToHoldings(order, stock);
      }
      return reply.status(201).send(order);
    },
  );

  app.delete(
    '/orders/:id',
    { schema: { tags: ['account'], summary: '주문 취소 (CAN-001~004)', params: OrderIdParams, response: { 200: OrderCancelResult, 404: ErrorResponse, 409: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)

      // 실제 gRPC 경로 — TradingService.CancelOrder.
      if (env.dataSource === 'grpc') {
        try {
          const { releasedAmount } = await grpcCancelOrder({
            userId: resolveActor(req),
            orderId: req.params.id,
            idempotencyKey,
          });
          return reply.send({ id: req.params.id, status: 'cancelled' as const, releasedAmount, cancelledAt: new Date().toISOString() });
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 404 | 409 | 500 | 503 | 504).send(mapped);
        }
      }

      const order = reservations.find((o) => o.id === req.params.id) ?? transactions.find((o) => o.id === req.params.id);
      if (!order) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown order: ${req.params.id}` });

      // Real flow: BFF -> Order Service cancel; on success -> Account Service release reserved_balance.
      // Mock flow: only PENDING limit orders can be cancelled and released immediately.
      if (order.status !== 'pending') {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '체결 또는 취소된 주문은 취소할 수 없습니다.' });
      }
      if (order.orderKind !== 'limit') {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '시장가/시간외종가 즉시 주문은 취소할 수 없습니다.' });
      }

      const releasedAmount = order.amount + order.fee;
      order.status = 'cancelled';
      return { id: req.params.id, status: 'cancelled' as const, releasedAmount, cancelledAt: new Date().toISOString() };
    },
  );

  app.patch(
    '/orders/:id',
    { schema: { tags: ['account'], summary: '지정가 주문 정정 (CAN-005/007/008)', params: OrderIdParams, body: AmendOrderBody, response: { 201: Transaction, 404: ErrorResponse, 409: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)

      // 실제 gRPC 경로 — OrderService.AmendOrder (원주문 취소 후 parent 연결된 신규 주문).
      if (env.dataSource === 'grpc') {
        try {
          const tx = await grpcAmendOrder({
            userId: resolveActor(req),
            orderId: req.params.id,
            quantity: req.body.quantity,
            price: req.body.price,
            idempotencyKey,
          });
          return reply.status(201).send(tx);
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 404 | 409 | 500 | 503 | 504).send(mapped);
        }
      }

      const order = reservations.find((o) => o.id === req.params.id) ?? transactions.find((o) => o.id === req.params.id);
      if (!order) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown order: ${req.params.id}` });
      if (order.status !== 'pending' || order.orderKind !== 'limit') {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'PENDING 상태의 지정가 주문만 정정할 수 있습니다.' });
      }

      // Real flow: cancel original order, release reserved balance, then submit a new limit order with parent_order_id.
      order.status = 'cancelled';
      const amount = req.body.quantity * req.body.price;
      const amended: Transaction = {
        ...order,
        id: `t_${Date.now()}`,
        parentOrderId: order.id,
        quantity: req.body.quantity,
        price: req.body.price,
        amount,
        fee: Math.round(amount * 0.00015),
        status: 'pending',
        executedAt: new Date().toISOString(),
      };
      reservations.unshift(amended);
      return reply.status(201).send(amended);
    },
  );

  // ── 예약 주문 (RSV-*) ─────────────────────────────────────────────
  app.get(
    '/reservations',
    { schema: { tags: ['account'], summary: '예약 주문 목록 조회 (RSV-009)', querystring: ReservationListQuery, response: { 200: Type.Array(Reservation), 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      if (env.dataSource === 'grpc') {
        try {
          return await grpcListReservations({ userId: resolveActor(req), status: req.query.status });
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      return req.query.status ? demoReservations.filter((r) => r.status === req.query.status) : demoReservations;
    },
  );

  app.get(
    '/reservations/:id',
    { schema: { tags: ['account'], summary: '예약 주문 상세 조회', params: ReservationIdParams, response: { 200: Reservation, 404: ErrorResponse } } },
    async (req, reply) => {
      const r = demoReservations.find((x) => x.id === req.params.id);
      if (!r) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown reservation: ${req.params.id}` });
      return r;
    },
  );

  app.post(
    '/reservations',
    {
      schema: {
        tags: ['account'],
        summary: '예약 주문 생성 (시점/유형/날짜 제약)',
        body: CreateReservationBody,
        response: { 201: Reservation, 400: ErrorResponse, 404: ErrorResponse, 422: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse },
      },
    },
    // NOTE: 스케줄 실행/체결·자동취소(RSV-010~015)는 백엔드 책임. 목은 접수 결과만 합성.
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)

      // 실제 gRPC 경로 — ReservationService.PlaceReservation.
      // 입력/정책 검증(시점별 허용유형·지정가 가격·실행예정일)은 BFF에서, 잔고/보유·중복은 백엔드에서.
      if (env.dataSource === 'grpc') {
        const { type, timing, orderKind, quantity } = req.body;
        if (!allowedReservationKinds(timing).includes(orderKind)) {
          const hint = timing === 'open' ? '시가 예약은 시장가/지정가만 가능합니다.' : '종가 예약은 시간외종가만 가능합니다.';
          return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: hint });
        }
        if (orderKind === 'limit') {
          if (req.body.price == null) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '지정가 예약은 가격이 필요합니다.' });
          if (!Number.isInteger(req.body.price)) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '지정가는 1원 단위(정수)만 가능합니다.' });
        }
        const scheduledDate = resolveScheduledDate(timing, req.body.scheduledDate);
        if (!scheduledDate) {
          return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '실행 예정일은 내일부터 7일 이내여야 합니다.' });
        }
        try {
          const resolved = orderKind === 'limit'
            ? await resolveReservationPrice(req.body.symbol, timing, orderKind, req.body.price)
            : { price: 0 };
          if ('error' in resolved) return reply.code(resolved.error.statusCode).send(resolved.error);
          const r = await grpcPlaceReservation({
            userId: resolveActor(req),
            symbol: req.body.symbol,
            type,
            timing,
            orderKind,
            quantity,
            price: resolved.price,
            scheduledDate,
            idempotencyKey,
          });
          return reply.status(201).send(r);
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 400 | 404 | 422 | 500 | 503 | 504).send(mapped);
        }
      }

      const { type, timing, orderKind, quantity } = req.body;
      const stock = await provider.getStock(req.body.symbol);
      if (!stock) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${req.body.symbol}` });
      }

      // RSV-002/003: 시점별 허용 주문 유형 검증.
      if (!allowedReservationKinds(timing).includes(orderKind)) {
        const hint = timing === 'open' ? '시가 예약은 시장가/지정가만 가능합니다.' : '종가 예약은 시간외종가만 가능합니다.';
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: hint });
      }

      // RSV-002 지정가: 가격 필수 + 정수(ORD-011과 동일).
      if (orderKind === 'limit') {
        if (req.body.price == null) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '지정가 예약은 가격이 필요합니다.' });
        if (!Number.isInteger(req.body.price)) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '지정가는 1원 단위(정수)만 가능합니다.' });
      }

      // RSV-004/005: 실행 예정일 결정/검증.
      const scheduledDate = resolveScheduledDate(timing, req.body.scheduledDate);
      if (!scheduledDate) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '실행 예정일은 내일부터 7일 이내여야 합니다.' });
      }

      // 예상 체결가: 지정가=입력값, 시장가=현재가, 시간외종가=전일종가(전일종가 예약) / 현재가(당일종가 예약 추정).
      const price =
        orderKind === 'limit'
          ? req.body.price!
          : timing === 'prev_close'
            ? stock.prevClose
            : stock.price;
      const amount = price * quantity;
      const fee = Math.round(amount * 0.00015);

      // 기존 주문 API와 동일하게 접수 단계에서 기본 잔고/보유 수량 검증.
      if (type === 'buy' && amount + fee > getAccount().cash) {
        return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: '가용 가능 금액이 부족합니다.' });
      }
      if (type === 'sell') {
        const held = holdings.find((h) => h.symbol === stock.symbol && h.isActive)?.quantity ?? 0;
        if (quantity > held) {
          return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: `보유 수량(${held}주)을 초과했습니다.` });
        }
      }

      const reservation: Reservation = {
        id: `rsv_${Date.now()}`,
        symbol: stock.symbol,
        name: stock.name,
        type,
        timing,
        orderKind,
        quantity,
        price: orderKind === 'limit' ? req.body.price : undefined,
        scheduledDate,
        amount,
        fee,
        status: 'reserved',
        createdAt: new Date().toISOString(),
      };
      demoReservations.unshift(reservation);
      return reply.status(201).send(reservation);
    },
  );

  app.delete(
    '/reservations/:id',
    { schema: { tags: ['account'], summary: '예약 주문 취소 (RSV-016~018)', params: ReservationIdParams, response: { 204: Type.Null(), 404: ErrorResponse, 409: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    // NOTE: mock — 실제로는 reserved_balance 반환(RSV-014/취소). 여기선 접수 취소만.
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)

      // 실제 gRPC 경로 — ReservationService.CancelReservation. 성공 시 204(계약 유지).
      if (env.dataSource === 'grpc') {
        try {
          await grpcCancelReservation({ userId: resolveActor(req), reservationId: req.params.id, idempotencyKey });
          return reply.status(204).send(null);
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 404 | 409 | 500 | 503 | 504).send(mapped);
        }
      }

      const r = demoReservations.find((x) => x.id === req.params.id);
      if (!r) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown reservation: ${req.params.id}` });
      if (r.status !== 'reserved') return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'RESERVED 상태의 예약 주문만 취소할 수 있습니다.' });
      r.status = 'cancelled';
      return reply.status(204).send(null);
    },
  );

  app.patch(
    '/reservations/:id',
    {
      schema: {
        tags: ['account'],
        summary: '예약 주문 정정 (CAN-006~008)',
        params: ReservationIdParams,
        body: AmendReservationBody,
        response: { 201: Reservation, 400: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    // NOTE: 예약 정정은 아직 mock 유지. proto AmendReservation은 전체 필드(timing/kind/quantity/
    //   price/scheduledDate)를 요구하는데 이 바디는 partial patch라 원본과 병합이 필요하고,
    //   ReservationService엔 단건 조회(GetReservation) RPC가 없어 BFF가 원본을 못 가져온다.
    //   → grpc 전환 시: 프론트가 전체 필드를 보내거나 백엔드에 GetReservation 추가 후 연결.
    async (req, reply) => {
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      const original = demoReservations.find((x) => x.id === req.params.id);
      if (!original) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown reservation: ${req.params.id}` });
      if (original.status !== 'reserved') {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'RESERVED 상태의 예약 주문만 정정할 수 있습니다.' });
      }

      const timing = req.body.timing ?? original.timing;
      const orderKind = req.body.orderKind ?? original.orderKind;
      const quantity = req.body.quantity ?? original.quantity;
      if (!allowedReservationKinds(timing).includes(orderKind)) {
        const hint = timing === 'open' ? '시가 예약은 시장가/지정가만 가능합니다.' : '종가 예약은 시간외종가만 가능합니다.';
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: hint });
      }
      if (orderKind === 'limit' && req.body.price == null && original.price == null) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '지정가 예약은 가격이 필요합니다.' });
      }

      const scheduledDate = resolveScheduledDate(timing, req.body.scheduledDate ?? original.scheduledDate);
      if (!scheduledDate) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '실행 예정일은 내일부터 7일 이내여야 합니다.' });
      }

      const stock = await provider.getStock(original.symbol);
      if (!stock) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${original.symbol}` });
      }
      const price =
        orderKind === 'limit'
          ? (req.body.price ?? original.price)!
          : timing === 'prev_close'
            ? stock.prevClose
            : stock.price;
      const amount = price * quantity;

      // Real flow: cancel original reservation, release its reserved amount, submit a new reservation with parent_order_id.
      original.status = 'cancelled';
      const amended: Reservation = {
        ...original,
        id: `rsv_${Date.now()}`,
        parentOrderId: original.id,
        timing,
        orderKind,
        quantity,
        price: orderKind === 'limit' ? price : undefined,
        scheduledDate,
        amount,
        fee: Math.round(amount * 0.00015),
        status: 'reserved',
        createdAt: new Date().toISOString(),
      };
      demoReservations.unshift(amended);
      return reply.status(201).send(amended);
    },
  );

  app.post(
    '/reset',
    { schema: { tags: ['account'], summary: '계정 초기화 (포트폴리오 리셋)', response: { 200: Account } } },
    // NOTE: mock — returns a fresh starting-capital account without persisting.
    async (req) => {
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      return getResetAccount();
    },
  );

  app.post(
    '/deactivate',
    { schema: { tags: ['account'], summary: '계좌 비활성화 (Auth 탈퇴 이벤트 처리)', response: { 200: Account } } },
    // NOTE: mock — real deactivation is triggered by an Auth 탈퇴 event in the Account service.
    async (req) => {
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      return getDeactivatedAccount();
    },
  );

  app.get(
    '/watchlist',
    { schema: { tags: ['account'], summary: '관심종목 목록', response: { 200: Type.Array(Quote), 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      // 관심목록의 "소유"는 wishlist-service(grpc), 시세(Quote)는 market 경로에서 머지한다.
      if (env.dataSource === 'grpc') {
        try {
          const entries = await grpcListWatchlist(resolveActor(req));
          return entries.map((e) => getQuote(e.symbol)).filter((q): q is NonNullable<typeof q> => Boolean(q));
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 500 | 503 | 504).send(mapped);
        }
      }
      return [...watchlistSymbols].map((s) => getQuote(s)).filter((q): q is NonNullable<typeof q> => Boolean(q));
    },
  );

  app.post(
    '/watchlist',
    {
      schema: {
        tags: ['account'],
        summary: '관심종목 추가',
        body: AddWatchlistBody,
        response: { 201: WatchlistItem, 404: ErrorResponse, 409: ErrorResponse, 400: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse },
      },
    },
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      const { symbol } = req.body;
      const quote = getQuote(symbol);
      if (!quote) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown symbol: ${symbol}` });
      }

      // 실제 gRPC 경로 — WishlistService.AddWishlistItem. 중복/한도는 백엔드가 판정한다.
      if (env.dataSource === 'grpc') {
        try {
          const entry = await grpcAddWatchlist({
            userId: resolveActor(req),
            symbol,
            displayName: quote.name,
            market: quote.exchange,
            idempotencyKey,
          });
          return reply.status(201).send({ symbol: entry.symbol, name: entry.name, addedAt: entry.addedAt });
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 400 | 404 | 409 | 500 | 503 | 504).send(mapped);
        }
      }

      const result = addWatchlistSymbol(symbol);
      if (result === 'duplicate') {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '이미 관심종목에 등록된 종목입니다' });
      }
      if (result === 'limit') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: `관심종목은 최대 ${WATCHLIST_LIMIT}개까지 등록할 수 있습니다` });
      }
      return reply.status(201).send({ symbol: quote.symbol, name: quote.name, addedAt: new Date().toISOString() });
    },
  );

  app.delete(
    '/watchlist/:symbol',
    { schema: { tags: ['account'], summary: '관심종목 제거', params: WatchlistSymbolParams, response: { 204: Type.Null(), 404: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse, 504: ErrorResponse } } },
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)

      // 실제 gRPC 경로 — WishlistService.RemoveWishlistItem. 미등록 종목은 백엔드가 NOT_FOUND.
      if (env.dataSource === 'grpc') {
        try {
          await grpcRemoveWatchlist({ userId: resolveActor(req), symbol: req.params.symbol, idempotencyKey });
          return reply.status(204).send(null);
        } catch (e) {
          const mapped = mapGrpcError(e, req.id);
          return reply.code(mapped.statusCode as 404 | 500 | 503 | 504).send(mapped);
        }
      }

      const removed = removeWatchlistSymbol(req.params.symbol);
      if (!removed) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: '관심종목에 등록되지 않은 종목입니다' });
      }
      return reply.status(204).send(null);
    },
  );
};

export default accountRoutes;
