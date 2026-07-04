/**
 * MarketService gRPC 클라이언트 (nice-grpc).
 *
 * 실시간 그래프 초기 스냅샷(당일 틱)을 market-service에서 가져온다.
 * 주소는 env.grpc.marketAddr(기본 localhost:50053).
 */
import { createClient, type Client } from 'nice-grpc';
import type { IntradayTick, MarketStatus } from '@candle/shared';
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

/**
 * 장 운영 상태(권위 소스 = market-service MarketSession). 주말·공휴일·정규장 시간을
 * 모두 반영한다. 주문 경로에서 동기적으로 쓰이므로 짧은 deadline을 둔다 — 초과 시
 * throw 되어 호출부가 로컬 계산으로 폴백한다.
 */
export async function grpcGetMarketStatus(): Promise<MarketStatus> {
  const res = await getClient().getMarketStatus({}, { signal: AbortSignal.timeout(500) });
  return {
    open: res.open,
    session: res.open ? 'regular' : 'closed',
    asOf: new Date().toISOString(),
    message: res.open
      ? undefined
      : '정규장 시간이 아닙니다 (평일 09:00~15:30 KST, 휴장일 제외). 주문은 예약으로 접수됩니다.',
  };
}
