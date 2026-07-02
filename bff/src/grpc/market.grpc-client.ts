/**
 * MarketService gRPC 클라이언트 (nice-grpc).
 *
 * 실시간 그래프 초기 스냅샷(당일 틱)을 market-service에서 가져온다.
 * 주소는 env.grpc.marketAddr(기본 localhost:50053).
 */
import { createClient, type Client } from 'nice-grpc';
import type { IntradayTick } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import { MarketServiceDefinition } from './gen/candle/market/v1/market';

type MarketServiceClient = Client<typeof MarketServiceDefinition>;

let client: MarketServiceClient | null = null;

function getClient(): MarketServiceClient {
  return (client ??= createClient(MarketServiceDefinition, getChannel(env.grpc.marketAddr)));
}

/** 당일 틱 스냅샷(오래된 → 최신). limit=0 이면 서버 기본값. */
export async function grpcGetIntradayTicks(symbol: string, limit = 0): Promise<IntradayTick[]> {
  const res = await getClient().getIntradayTicks({ symbol, limit });
  return res.ticks
    .filter((t) => t.ts)
    .map((t) => ({ price: Number(t.price), timestamp: (t.ts as Date).toISOString() }));
}
