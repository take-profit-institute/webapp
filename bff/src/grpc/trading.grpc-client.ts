/**
 * trading-service gRPC 클라이언트 (nice-grpc).
 *
 * BFF `account` 도메인 → 백엔드 trading-service. proto가 3개 서비스로 분리돼 있어
 * 각각 클라이언트를 만든다(모두 같은 채널 = env.grpc.accountAddr, 기본 localhost:50054):
 *   - OrderService       : 즉시 주문(목록/체결/취소/정정)
 *   - ReservationService : 예약 주문(목록/접수/취소/정정)
 *   - AccountService     : 잔고
 *
 * 멱등성 단일 소스: 호출부가 넘긴 idempotencyKey를 metadata `x-idempotency-key`와
 * request body `command_metadata.idempotency_key` 양쪽에 같은 값으로 주입한다(스펙 §2).
 * DATA_SOURCE=grpc일 때만 사용한다.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
import type { AccountBalance, Reservation, Transaction } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import { OrderServiceDefinition, type Order } from './gen/candle/trading/v1/order';
import {
  ReservationServiceDefinition,
  type Reservation as ProtoReservation,
} from './gen/candle/trading/v1/reservation';
import { AccountServiceDefinition, type AccountBalance as ProtoBalance } from './gen/candle/trading/v1/account';
import {
  OrderKind,
  OrderSide,
  OrderStatus,
  ReservationStatus,
  ReservationTiming,
} from './gen/candle/trading/v1/trading_common';

type OrderClient = Client<typeof OrderServiceDefinition>;
type ReservationClient = Client<typeof ReservationServiceDefinition>;
type AccountClient = Client<typeof AccountServiceDefinition>;

let orderClient: OrderClient | null = null;
let reservationClient: ReservationClient | null = null;
let accountClient: AccountClient | null = null;

// trading-service 단일 채널(accountAddr)을 세 서비스가 공유한다.
function orders(): OrderClient {
  return (orderClient ??= createClient(OrderServiceDefinition, getChannel(env.grpc.accountAddr)));
}
function reservationsSvc(): ReservationClient {
  return (reservationClient ??= createClient(ReservationServiceDefinition, getChannel(env.grpc.accountAddr)));
}
function accountSvc(): AccountClient {
  return (accountClient ??= createClient(AccountServiceDefinition, getChannel(env.grpc.accountAddr)));
}

function callMetadata(idempotencyKey: string, userId: string): Metadata {
  return Metadata({ 'x-idempotency-key': idempotencyKey, 'x-user-id': userId });
}

const FEE_RATE = 0.00015;

// ── shared → proto enum ─────────────────────────────────────────────
const sideOf = (t: 'buy' | 'sell'): OrderSide =>
  t === 'buy' ? OrderSide.ORDER_SIDE_BUY : OrderSide.ORDER_SIDE_SELL;

const orderKindOf = (k: 'market' | 'limit'): OrderKind =>
  k === 'limit' ? OrderKind.ORDER_KIND_LIMIT : OrderKind.ORDER_KIND_MARKET;

const reservationKindOf = (k: 'market' | 'limit' | 'after_hours_close'): OrderKind =>
  k === 'limit'
    ? OrderKind.ORDER_KIND_LIMIT
    : k === 'after_hours_close'
      ? OrderKind.ORDER_KIND_AFTER_HOURS_CLOSE
      : OrderKind.ORDER_KIND_MARKET;

const timingOf = (t: 'open' | 'prev_close' | 'today_close'): ReservationTiming =>
  t === 'open'
    ? ReservationTiming.RESERVATION_TIMING_OPEN
    : t === 'prev_close'
      ? ReservationTiming.RESERVATION_TIMING_PREV_CLOSE
      : ReservationTiming.RESERVATION_TIMING_TODAY_CLOSE;

const orderStatusOf = (s?: 'filled' | 'pending' | 'cancelled'): OrderStatus =>
  s === 'filled'
    ? OrderStatus.ORDER_STATUS_FILLED
    : s === 'cancelled'
      ? OrderStatus.ORDER_STATUS_CANCELLED
      : s === 'pending'
        ? OrderStatus.ORDER_STATUS_PENDING
        : OrderStatus.ORDER_STATUS_UNSPECIFIED; // 미지정 = 전체

const reservationStatusOf = (s?: 'reserved' | 'pending' | 'filled' | 'cancelled'): ReservationStatus =>
  s === 'reserved'
    ? ReservationStatus.RESERVATION_STATUS_RESERVED
    : s === 'filled'
      ? ReservationStatus.RESERVATION_STATUS_EXECUTED
      : s === 'cancelled'
        ? ReservationStatus.RESERVATION_STATUS_CANCELLED
        : ReservationStatus.RESERVATION_STATUS_UNSPECIFIED; // 미지정/pending = 전체

// ── proto → shared ──────────────────────────────────────────────────
function orderKindToShared(k: OrderKind): 'market' | 'limit' {
  return k === OrderKind.ORDER_KIND_LIMIT ? 'limit' : 'market';
}

function orderStatusToShared(s: OrderStatus): Transaction['status'] {
  switch (s) {
    case OrderStatus.ORDER_STATUS_FILLED:
      return 'filled';
    case OrderStatus.ORDER_STATUS_CANCELLED:
    case OrderStatus.ORDER_STATUS_REJECTED:
      return 'cancelled';
    default:
      return 'pending';
  }
}

function reservationKindToShared(k: OrderKind): 'market' | 'limit' | 'after_hours_close' {
  switch (k) {
    case OrderKind.ORDER_KIND_LIMIT:
      return 'limit';
    case OrderKind.ORDER_KIND_AFTER_HOURS_CLOSE:
      return 'after_hours_close';
    default:
      return 'market';
  }
}

function timingToShared(t: ReservationTiming): Reservation['timing'] {
  switch (t) {
    case ReservationTiming.RESERVATION_TIMING_PREV_CLOSE:
      return 'prev_close';
    case ReservationTiming.RESERVATION_TIMING_TODAY_CLOSE:
      return 'today_close';
    default:
      return 'open';
  }
}

function reservationStatusToShared(s: ReservationStatus): Reservation['status'] {
  switch (s) {
    case ReservationStatus.RESERVATION_STATUS_EXECUTED:
      return 'filled';
    case ReservationStatus.RESERVATION_STATUS_CANCELLED:
      return 'cancelled';
    default:
      return 'reserved';
  }
}

/** proto Order → BFF Transaction. 체결 상세(체결가/수수료/세금/정산금액)는 trading-service가 채운다. */
function orderToTransaction(order: Order | undefined): Transaction {
  if (!order) throw new Error('trading-service returned empty order');
  const quantity = Number(order.quantity);
  const limitPrice = Number(order.price);
  const executedPrice = Number(order.executedPrice);
  const shownPrice = executedPrice > 0 ? executedPrice : limitPrice; // 체결가 우선, 미체결은 주문가
  const netAmount = Number(order.netAmount);
  const amount = netAmount > 0 ? netAmount : quantity * shownPrice;
  return {
    id: order.id,
    type: order.side === OrderSide.ORDER_SIDE_BUY ? 'buy' : 'sell',
    orderKind: orderKindToShared(order.kind),
    parentOrderId: order.parentOrderId || undefined,
    symbol: order.symbol,
    name: order.symbol,
    quantity,
    price: shownPrice,
    amount,
    fee: Number(order.fee),
    tax: Number(order.tax) || undefined,
    netAmount: netAmount > 0 ? netAmount : undefined,
    executedPrice: executedPrice > 0 ? executedPrice : undefined,
    status: orderStatusToShared(order.status),
    // ts-proto는 protobuf Timestamp를 Date로 매핑한다. 체결시각 우선, 없으면 생성시각.
    executedAt: (order.executedAt ?? order.createdAt ?? new Date()).toISOString(),
  };
}

/** proto Reservation → BFF Reservation. */
function reservationToShared(r: ProtoReservation | undefined): Reservation {
  if (!r) throw new Error('trading-service returned empty reservation');
  const quantity = Number(r.quantity);
  const price = Number(r.price);
  const isLimit = r.kind === OrderKind.ORDER_KIND_LIMIT;
  const amount = quantity * price;
  return {
    id: r.id,
    symbol: r.symbol,
    name: r.symbol,
    type: r.side === OrderSide.ORDER_SIDE_BUY ? 'buy' : 'sell',
    timing: timingToShared(r.timing),
    orderKind: reservationKindToShared(r.kind),
    parentOrderId: r.parentReservationId || undefined,
    quantity,
    price: isLimit ? price : undefined,
    scheduledDate: r.scheduledDate,
    amount,
    fee: Math.round(amount * FEE_RATE),
    status: reservationStatusToShared(r.status),
    createdAt: (r.createdAt ?? new Date()).toISOString(),
  };
}

function balanceToShared(b: ProtoBalance | undefined): AccountBalance {
  if (!b) throw new Error('trading-service returned empty balance');
  return {
    totalBalance: Number(b.cash),
    lockedAmount: Number(b.reservedBalance),
    availableAmount: Number(b.availableCash),
  };
}

// ── OrderService ────────────────────────────────────────────────────
export interface GrpcPlaceOrderInput {
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  orderKind: 'market' | 'limit';
  quantity: number;
  price: number;
  idempotencyKey: string;
}

export async function grpcPlaceOrder(input: GrpcPlaceOrderInput): Promise<Transaction> {
  const res = await orders().placeOrder(
    {
      userId: input.userId,
      symbol: input.symbol,
      side: sideOf(input.type),
      kind: orderKindOf(input.orderKind),
      quantity: String(input.quantity),
      price: String(input.price),
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return orderToTransaction(res.order);
}

export interface GrpcCancelOrderInput {
  userId: string;
  orderId: string;
  idempotencyKey: string;
}

export async function grpcCancelOrder(
  input: GrpcCancelOrderInput,
): Promise<{ releasedAmount: number; order: Transaction }> {
  const res = await orders().cancelOrder(
    {
      userId: input.userId,
      orderId: input.orderId,
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return { releasedAmount: Number(res.releasedAmount), order: orderToTransaction(res.order) };
}

export interface GrpcAmendOrderInput {
  userId: string;
  orderId: string;
  quantity: number;
  price: number;
  idempotencyKey: string;
}

export async function grpcAmendOrder(input: GrpcAmendOrderInput): Promise<Transaction> {
  const res = await orders().amendOrder(
    {
      userId: input.userId,
      orderId: input.orderId,
      quantity: String(input.quantity),
      price: String(input.price),
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return orderToTransaction(res.order);
}

export async function grpcListOrders(input: {
  userId: string;
  status?: 'filled' | 'pending' | 'cancelled';
}): Promise<Transaction[]> {
  const res = await orders().listOrders(
    { userId: input.userId, status: orderStatusOf(input.status), page: undefined },
    { metadata: Metadata({ 'x-user-id': input.userId }) },
  );
  return res.orders.map(orderToTransaction);
}

// ── AccountService ──────────────────────────────────────────────────
export async function grpcGetBalance(userId: string): Promise<AccountBalance> {
  const res = await accountSvc().getBalance(
    { userId },
    { metadata: Metadata({ 'x-user-id': userId }) },
  );
  return balanceToShared(res.balance);
}

// ── ReservationService ──────────────────────────────────────────────
export async function grpcListReservations(input: {
  userId: string;
  status?: 'reserved' | 'pending' | 'filled' | 'cancelled';
}): Promise<Reservation[]> {
  const res = await reservationsSvc().listReservations(
    { userId: input.userId, status: reservationStatusOf(input.status), page: undefined },
    { metadata: Metadata({ 'x-user-id': input.userId }) },
  );
  return res.reservations.map(reservationToShared);
}

export interface GrpcPlaceReservationInput {
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  timing: 'open' | 'prev_close' | 'today_close';
  orderKind: 'market' | 'limit' | 'after_hours_close';
  quantity: number;
  price: number;
  scheduledDate: string;
  idempotencyKey: string;
}

export async function grpcPlaceReservation(input: GrpcPlaceReservationInput): Promise<Reservation> {
  const res = await reservationsSvc().placeReservation(
    {
      userId: input.userId,
      symbol: input.symbol,
      side: sideOf(input.type),
      timing: timingOf(input.timing),
      kind: reservationKindOf(input.orderKind),
      quantity: String(input.quantity),
      price: String(input.price),
      scheduledDate: input.scheduledDate,
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return reservationToShared(res.reservation);
}

export interface GrpcCancelReservationInput {
  userId: string;
  reservationId: string;
  idempotencyKey: string;
}

export async function grpcCancelReservation(
  input: GrpcCancelReservationInput,
): Promise<{ releasedAmount: number; reservation: Reservation }> {
  const res = await reservationsSvc().cancelReservation(
    {
      userId: input.userId,
      reservationId: input.reservationId,
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return { releasedAmount: Number(res.releasedAmount), reservation: reservationToShared(res.reservation) };
}

export interface GrpcAmendReservationInput {
  userId: string;
  reservationId: string;
  timing: 'open' | 'prev_close' | 'today_close';
  orderKind: 'market' | 'limit' | 'after_hours_close';
  quantity: number;
  price: number;
  scheduledDate: string;
  idempotencyKey: string;
}

export async function grpcAmendReservation(input: GrpcAmendReservationInput): Promise<Reservation> {
  const res = await reservationsSvc().amendReservation(
    {
      userId: input.userId,
      reservationId: input.reservationId,
      timing: timingOf(input.timing),
      kind: reservationKindOf(input.orderKind),
      quantity: String(input.quantity),
      price: String(input.price),
      scheduledDate: input.scheduledDate,
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return reservationToShared(res.reservation);
}
