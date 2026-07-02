/**
 * 실제 ChartService gRPC 클라이언트.
 *
 * BFF `market/stocks/:symbol/candles` HTTP 계약은 유지하고,
 * 내부 데이터 소스만 stock-service `candle.stock.v1.ChartService` 로 연결한다.
 */
import { createClient, type Client } from 'nice-grpc';
import type { Candle, CandleInterval as SharedCandleInterval } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import {
  CandleInterval,
  ChartServiceDefinition,
  type Candle as ProtoCandle,
} from './gen/candle/stock/v1/chart';

type ChartServiceClient = Client<typeof ChartServiceDefinition>;

let client: ChartServiceClient | null = null;

function getClient(): ChartServiceClient {
  if (!client) {
    client = createClient(ChartServiceDefinition, getChannel(env.grpc.stockAddr));
  }
  return client;
}

export async function grpcGetCandles(
  symbol: string,
  interval: SharedCandleInterval,
  limit: number,
): Promise<Candle[]> {
  const res = await getClient().getCandles({
    code: symbol,
    interval: intervalToProto(interval),
    limit,
  });
  return res.candles.map(toSharedCandle);
}

/** 52주 고저 + 최근 일봉 종가/거래량. candles(일봉) 집계 — 데이터 없으면 전부 0. */
export interface PriceStats {
  high52w: number;
  low52w: number;
  latestClose: number;
  latestVolume: number;
}

export async function grpcGetPriceStats(symbol: string, windowDays = 0): Promise<PriceStats> {
  // windowDays=0 → 서버 기본값(365, 약 52주) 사용.
  const res = await getClient().getPriceStats({ code: symbol, windowDays });
  return {
    high52w: Number(res.high),
    low52w: Number(res.low),
    latestClose: Number(res.latestClose),
    latestVolume: Number(res.latestVolume),
  };
}

function intervalToProto(interval: SharedCandleInterval): CandleInterval {
  switch (interval) {
    case '1w': return CandleInterval.WEEK_1;
    case '1M': return CandleInterval.MONTH_1;
    case '1d':
    default: return CandleInterval.DAY_1;
  }
}

function toSharedCandle(candle: ProtoCandle): Candle {
  return {
    date: formatDate(candle.openTime),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
  };
}

function formatDate(value: Date | undefined): string {
  if (!value) return '';
  return value.toISOString().split('T')[0] ?? '';
}
