/**
 * 종목 카탈로그 소스 추상화.
 *
 * DATA_SOURCE=grpc → 실제 stock-service(gRPC, DB + 키움 fallback).
 * 그 외(mock)      → 목 데이터로 동일 계약을 만족(로컬/오프라인 개발).
 */
import type { StockCatalogDetail, StockPage, StockSearchQuery, StockSummary } from '@candle/shared';
import { env } from '../config/env';
import { quotes } from '../data/market';
import { grpcGetStock, grpcSearchStocks } from '../grpc/stock.grpc-client';

export interface StockCatalogProvider {
  searchStocks(query: StockSearchQuery): Promise<StockPage>;
  getStock(code: string): Promise<StockCatalogDetail | undefined>;
}

class GrpcStockCatalogProvider implements StockCatalogProvider {
  searchStocks(query: StockSearchQuery): Promise<StockPage> {
    return grpcSearchStocks(query);
  }
  getStock(code: string): Promise<StockCatalogDetail | undefined> {
    return grpcGetStock(code);
  }
}

class MockStockCatalogProvider implements StockCatalogProvider {
  private readonly all: StockSummary[] = quotes.map((q) => ({
    code: q.symbol,
    name: q.name,
    market: q.exchange,
    sector: q.sector,
    marketCap: q.marketCap,
    sharesOutstanding: 0,
    status: 'LISTED',
  }));

  async searchStocks(query: StockSearchQuery): Promise<StockPage> {
    let rows = this.all;
    if (query.q) {
      const q = query.q.toLowerCase();
      rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    if (query.market) rows = rows.filter((s) => s.market === query.market);
    if (query.sector) rows = rows.filter((s) => s.sector === query.sector);

    const sorted = [...rows].sort(comparator(query.sort));
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const start = page * size;
    return {
      items: sorted.slice(start, start + size),
      totalElements: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / size)),
      page,
      size,
    };
  }

  async getStock(code: string): Promise<StockCatalogDetail | undefined> {
    const s = this.all.find((x) => x.code === code);
    if (!s) return undefined;
    return { ...s, description: '', source: 'DB' };
  }
}

function comparator(sort?: string): (a: StockSummary, b: StockSummary) => number {
  if (sort === 'NAME_ASC') return (a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code);
  if (sort === 'MARKET_CAP_DESC') return (a, b) => b.marketCap - a.marketCap || a.code.localeCompare(b.code);
  return (a, b) => a.code.localeCompare(b.code);
}

let provider: StockCatalogProvider | null = null;

export function getStockCatalogProvider(): StockCatalogProvider {
  if (provider) return provider;
  provider = env.dataSource === 'grpc' ? new GrpcStockCatalogProvider() : new MockStockCatalogProvider();
  return provider;
}
