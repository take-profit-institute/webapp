/**
 * MarketProvider implementation backed by MarketService gRPC.
 * Adapts gRPC NOT_FOUND errors to the undefined return expected by MarketProvider.
 *
 * Sparklines are NOT routed through MarketProvider — the market route handler
 * calls app.grpc.market.getSparklines() directly (BFF-specific aggregation).
 */
import type { Candle, MarketMovers, NewsItem, Quote, StockDetail } from '@candle/shared';
import type { MarketProvider, StockListFilter } from './market.provider';
import type { MarketServiceClient } from '../grpc/clients/market.client';
import { isGrpcError } from '../grpc/error-mapper';
import { GrpcStatus } from '../grpc/types';

export class GrpcMarketProvider implements MarketProvider {
  constructor(private readonly client: MarketServiceClient) {}

  listStocks(filter: StockListFilter): Promise<Quote[]> {
    return this.client.listStocks(filter);
  }

  async getStock(symbol: string): Promise<StockDetail | undefined> {
    try {
      return await this.client.getStock({ symbol });
    } catch (err) {
      if (isGrpcError(err) && err.code === GrpcStatus.NOT_FOUND) return undefined;
      throw err;
    }
  }

  getCandles(symbol: string, interval: '1d' | '1w' | '1M', limit: number): Promise<Candle[]> {
    return this.client.getCandles({ symbol, interval, limit });
  }

  getNews(symbol: string): Promise<NewsItem[]> {
    return this.client.getNews({ symbol });
  }

  getMovers(): Promise<MarketMovers> {
    return this.client.getMovers({});
  }
}
