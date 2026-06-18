/**
 * MarketService gRPC client stub.
 * Owns: stock quotes, candles, news, movers, sparklines.
 * NOT_FOUND from getStock → BFF converts to undefined (see GrpcMarketProvider).
 */
import type { Candle, MarketMovers, NewsItem, Quote, StockDetail } from '@candle/shared';
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export interface ListStocksRequest {
  q?: string;
  exchange?: string;
  sector?: string;
  limit?: number;
}

export interface GetCandlesRequest {
  symbol: string;
  interval: '1d' | '1w' | '1M';
  limit: number;
}

export interface GetSparklineRequest {
  symbols: string[];
  days: number;
}

export interface MarketServiceClient {
  listStocks(req: ListStocksRequest, opts?: GrpcCallOptions): Promise<Quote[]>;
  /** Throws GrpcError NOT_FOUND when symbol doesn't exist. */
  getStock(req: { symbol: string }, opts?: GrpcCallOptions): Promise<StockDetail>;
  getCandles(req: GetCandlesRequest, opts?: GrpcCallOptions): Promise<Candle[]>;
  getNews(req: { symbol: string }, opts?: GrpcCallOptions): Promise<NewsItem[]>;
  getMovers(req: Record<never, never>, opts?: GrpcCallOptions): Promise<MarketMovers>;
  getSparklines(req: GetSparklineRequest, opts?: GrpcCallOptions): Promise<Record<string, number[]>>;
}

class StubMarketServiceClient implements MarketServiceClient {
  listStocks(): Promise<Quote[]> { return notImplemented('MarketService', 'listStocks'); }
  getStock(): Promise<StockDetail> { return notImplemented('MarketService', 'getStock'); }
  getCandles(): Promise<Candle[]> { return notImplemented('MarketService', 'getCandles'); }
  getNews(): Promise<NewsItem[]> { return notImplemented('MarketService', 'getNews'); }
  getMovers(): Promise<MarketMovers> { return notImplemented('MarketService', 'getMovers'); }
  getSparklines(): Promise<Record<string, number[]>> { return notImplemented('MarketService', 'getSparklines'); }
}

export function createMarketServiceClient(_channel: GrpcChannel): MarketServiceClient {
  return new StubMarketServiceClient();
}
