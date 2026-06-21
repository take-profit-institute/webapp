/**
 * 실제 TradingService gRPC 클라이언트 (nice-grpc).
 *
 * BFF의 `account` 도메인 → 백엔드 `candle.trading.v1.TradingService` 매핑.
 * 주소는 env.grpc.accountAddr(기본 localhost:50054 = trading-service gRPC 포트)를 쓴다.
 *
 * 멱등성 단일 소스: 호출부가 넘긴 idempotencyKey를 metadata `x-idempotency-key`와
 * request body `command_metadata.idempotency_key` 양쪽에 같은 값으로 주입한다(스펙 §2).
 * DATA_SOURCE=grpc일 때만 사용한다.
 */
import { createChannel, createClient, Metadata } from 'nice-grpc';
import type { Transaction } from '@candle/shared';
import { env } from '../config/env';
import {
  TradingServiceDefinition,
  type TradingServiceClient,
  type Order,
  OrderSide,
  OrderKind,
  OrderStatus,
} from './gen/candle/trading/v1/trading';

let client: TradingServiceClient | null = null;

function getClient(): TradingServiceClient {
  if (!client) {
    const channel = createChannel(env.grpc.accountAddr); // account → trading
    client = createClient(TradingServiceDefinition, channel);
  }
  return client;
}

function callMetadata(idempotencyKey: string, userId: string): Metadata {
  return Metadata({
    'x-idempotency-key': idempotencyKey,
    'x-user-id': userId,
  });
}

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
  const response = await getClient().placeOrder(
    {
      userId: input.userId,
      symbol: input.symbol,
      side: input.type === 'buy' ? OrderSide.ORDER_SIDE_BUY : OrderSide.ORDER_SIDE_SELL,
      kind: input.orderKind === 'limit' ? OrderKind.ORDER_KIND_LIMIT : OrderKind.ORDER_KIND_MARKET,
      quantity: String(input.quantity),
      price: String(input.price),
      // 단일 소스 — metadata와 동일한 키
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return orderToTransaction(response.order);
}

export interface GrpcCancelOrderInput {
  userId: string;
  orderId: string;
  idempotencyKey: string;
}

export async function grpcCancelOrder(input: GrpcCancelOrderInput): Promise<{ releasedAmount: number; order: Transaction }> {
  const response = await getClient().cancelOrder(
    {
      userId: input.userId,
      orderId: input.orderId,
      commandMetadata: { idempotencyKey: input.idempotencyKey },
    },
    { metadata: callMetadata(input.idempotencyKey, input.userId) },
  );
  return {
    releasedAmount: Number(response.releasedAmount),
    order: orderToTransaction(response.order),
  };
}

// ── proto Order → BFF Transaction 매핑 ──────────────────────────────
function orderToTransaction(order: Order | undefined): Transaction {
  if (!order) {
    throw new Error('TradingService returned empty order');
  }
  const quantity = Number(order.quantity);
  const price = Number(order.price);
  const amount = quantity * price;
  return {
    id: order.id,
    type: order.side === OrderSide.ORDER_SIDE_BUY ? 'buy' : 'sell',
    orderKind: order.kind === OrderKind.ORDER_KIND_LIMIT ? 'limit' : 'market',
    parentOrderId: order.parentOrderId || undefined,
    symbol: order.symbol,
    name: order.symbol,
    quantity,
    price,
    amount,
    fee: Math.round(amount * 0.00015),
    status: toTransactionStatus(order.status),
    // ts-proto는 protobuf Timestamp를 Date로 매핑한다.
    executedAt: (order.createdAt ?? new Date()).toISOString(),
  };
}

function toTransactionStatus(status: OrderStatus): Transaction['status'] {
  switch (status) {
    case OrderStatus.ORDER_STATUS_FILLED:
      return 'filled';
    case OrderStatus.ORDER_STATUS_CANCELLED:
      return 'cancelled';
    default:
      return 'pending';
  }
}
