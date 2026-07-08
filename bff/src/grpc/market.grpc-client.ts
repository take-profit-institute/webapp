/**
 * MarketService gRPC 클라이언트 (nice-grpc).
 *
 * 실시간 그래프 초기 스냅샷(당일 틱)을 market-service에서 가져온다.
 * 주소는 env.grpc.marketAddr(기본 localhost:50053).
 */
import { createClient, type Client } from 'nice-grpc';
import type { IntradayTick, MarketStatus, Ranking, RankingType } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import {
  MarketServiceDefinition,
  RankingType as GenRankingType,
  type Quote as GenQuote,
  type RankingItem as GenRankingItem,
} from './gen/candle/market/v1/market';

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

/** 여러 종목 현재가를 market-service Redis 캐시에서 한 번에 조회한다. */
export async function grpcBatchQuotes(symbols: string[]): Promise<Map<string, number>> {
  const uniqueSymbols = [...new Set(symbols.filter(Boolean))];
  if (uniqueSymbols.length === 0) return new Map();

  const res = await getClient().batchQuotes({ symbols: uniqueSymbols }, { signal: AbortSignal.timeout(1000) });
  return new Map(
    res.quotes
      .map((quote) => [quote.symbol, Number(quote.price)] as const)
      .filter(([, price]) => Number.isFinite(price) && price > 0),
  );
}

export type MarketQuoteSnapshot = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  updatedAt?: string;
};

export async function grpcGetQuote(symbol: string): Promise<MarketQuoteSnapshot | null> {
  const res = await getClient().getQuote({ symbol }, { signal: AbortSignal.timeout(1000) });
  return res.quote ? toMarketQuoteSnapshot(res.quote) : null;
}

function toMarketQuoteSnapshot(quote: GenQuote): MarketQuoteSnapshot {
  return {
    symbol: quote.symbol,
    price: Number(quote.price),
    change: Number(quote.change),
    changePercent: quote.changeRate,
    volume: Number(quote.volume),
    updatedAt: quote.quotedAt ? (quote.quotedAt as Date).toISOString() : undefined,
  };
}

/**
 * 트렌딩 랭킹 top-N. market-service 가 Redis 캐시(스케줄러 write-through)만 읽어 돌려준다 —
 * 키움 API 를 유저 요청마다 타지 않는다. 캐시 miss 시 UNAVAILABLE 로 throw 되므로 호출부가
 * 빈 결과로 폴백한다. limit=0 이면 캐시 전체.
 */
export async function grpcGetRankings(type: RankingType, limit = 0): Promise<Ranking> {
  const res = await getClient().getRankings(
    { type: GenRankingType[type], limit },
    { signal: AbortSignal.timeout(1000) },
  );
  return {
    type,
    asOf: (res.asOf as Date | undefined)?.toISOString() ?? new Date().toISOString(),
    items: res.items.map(toRankingItem),
  };
}

function toRankingItem(item: GenRankingItem): Ranking['items'][number] {
  return {
    rank: item.rank,
    symbol: item.symbol,
    name: item.name,
    price: Number(item.currentPrice),
    change: Number(item.priceChange),
    changePercent: item.priceChangeRate,
    volume: Number(item.tradingVolume),
  };
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
