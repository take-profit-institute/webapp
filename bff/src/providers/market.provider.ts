import type { Candle, MarketMovers, NewsItem, Quote, StockDetail } from '@candle/shared';

export interface StockListFilter {
  q?: string;
  exchange?: string;
  sector?: string;
  limit?: number;
}

/**
 * Abstraction over the market-data source.
 *
 * Today it's backed by mock data ({@link MockMarketProvider}). When the Korea
 * Investment (한국투자증권) OpenAPI keys arrive, add a `KisMarketProvider`
 * implementing this same interface and switch via `DATA_SOURCE=kis` — no route
 * or schema changes needed.
 */
export interface MarketProvider {
  listStocks(filter: StockListFilter): Promise<Quote[]>;
  getStock(symbol: string): Promise<StockDetail | undefined>;
  getCandles(symbol: string, interval: '1d' | '1w' | '1M', limit: number): Promise<Candle[]>;
  getNews(symbol: string): Promise<NewsItem[]>;
  getMovers(): Promise<MarketMovers>;
}
