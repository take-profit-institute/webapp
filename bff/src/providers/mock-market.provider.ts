import {
  generateCandles,
  getNews,
  getStockDetail,
  quotes,
} from '../data/market';
import type { MarketMovers, Quote } from '@candle/shared';
import type { MarketProvider, StockListFilter } from './market.provider';

export class MockMarketProvider implements MarketProvider {
  async listStocks(filter: StockListFilter): Promise<Quote[]> {
    let result = quotes;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q),
      );
    }
    if (filter.exchange) result = result.filter((s) => s.exchange === filter.exchange);
    if (filter.sector) result = result.filter((s) => s.sector === filter.sector);
    if (filter.limit) result = result.slice(0, filter.limit);
    return result;
  }

  async getStock(symbol: string) {
    return getStockDetail(symbol);
  }

  async getCandles(symbol: string, interval: '1d' | '1w' | '1M', limit: number) {
    return generateCandles(symbol, interval, limit);
  }

  async getNews(symbol: string) {
    return getNews(symbol);
  }

  async getMovers(): Promise<MarketMovers> {
    const byChange = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
    const byVolume = [...quotes].sort((a, b) => b.volume - a.volume);
    return {
      gainers: byChange.slice(0, 5),
      losers: byChange.slice(-5).reverse(),
      mostActive: byVolume.slice(0, 5),
    };
  }
}
