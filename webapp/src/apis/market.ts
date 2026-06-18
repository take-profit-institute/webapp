/** Market data endpoints (`/api/market/*`). */
import type {
  Candle,
  CandleInterval,
  Exchange,
  IntradayHistory,
  MarketMovers,
  MarketStatus,
  NewsItem,
  Quote,
  StockDetail,
} from '@/lib/api-types';
import { apiClient } from './client';

/** 장 운영 상태 (정규장/마감) — ORD-012. */
export function getMarketStatus(): Promise<MarketStatus> {
  return apiClient.get<MarketStatus>('/api/market/status');
}

export interface StockListParams {
  q?: string;
  exchange?: Exchange;
  sector?: string;
  limit?: number;
}

/** Known tradable symbols — used for static pre-rendering of `/market/[symbol]`.
 * When real data arrives this can be replaced by a build-time fetch of `getStocks()`. */
export const MARKET_SYMBOLS = [
  '005930', '000660', '373220', '005380', '035420', '035720', '068270', '207940',
  '006400', '051910', '091990', '247540',
] as const;

/** 종목 목록/검색. */
export function getStocks(params: StockListParams = {}): Promise<Quote[]> {
  return apiClient.get<Quote[]>('/api/market/stocks', { ...params });
}

/** 시장 동향 (상승/하락/거래상위). */
export function getMovers(): Promise<MarketMovers> {
  return apiClient.get<MarketMovers>('/api/market/movers');
}

/** 종목 상세. */
export function getStock(symbol: string): Promise<StockDetail> {
  return apiClient.get<StockDetail>(`/api/market/stocks/${encodeURIComponent(symbol)}`);
}

/** 캔들(OHLCV) 데이터. */
export function getCandles(
  symbol: string,
  params: { interval?: CandleInterval; limit?: number } = {},
): Promise<Candle[]> {
  return apiClient.get<Candle[]>(`/api/market/stocks/${encodeURIComponent(symbol)}/candles`, {
    ...params,
  });
}

/** 종목 뉴스. */
export function getStockNews(symbol: string): Promise<NewsItem[]> {
  return apiClient.get<NewsItem[]>(`/api/market/stocks/${encodeURIComponent(symbol)}/news`);
}

/** 전 종목 2주 스파크라인 — symbol → 일봉 종가 배열 (오래된 순). */
export function getSparklines(limit = 14): Promise<Record<string, number[]>> {
  return apiClient.get<Record<string, number[]>>('/api/market/sparklines', { limit });
}

/** 당일 실시간 틱 히스토리 — 초기 로드 후 WS로 이어 붙임. */
export function getIntradayHistory(symbol: string): Promise<IntradayHistory> {
  return apiClient.get<IntradayHistory>(`/api/market/stocks/${encodeURIComponent(symbol)}/intraday`);
}
