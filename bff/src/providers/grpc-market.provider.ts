/**
 * MarketProvider 구현 — 실시간 시세 백엔드(market-service gRPC)가 아직 없으므로
 * 종목 목록/상세/캔들은 stock-service(카탈로그 + ChartService)로 위임한다.
 *
 * - listStocks/getStock: stock-service StockService 카탈로그 → Quote/StockDetail 어댑트.
 *   시세 필드(price/change/volume 등)는 시세 소스가 없어 0으로 채운다.
 * - getCandles: stock-service ChartService (grpcGetCandles).
 * - getNews/getMovers: 백엔드 없음 → 빈 결과(throw 금지).
 */
import type {
  Candle,
  MarketMovers,
  NewsItem,
  Quote,
  StockCatalogDetail,
  StockDetail,
  StockSearchQuery,
  StockSummary,
} from '@candle/shared';
import type { MarketProvider, StockListFilter } from './market.provider';
import { grpcGetCandles } from '../grpc/stock-chart.grpc-client';
import { grpcGetStock, grpcSearchStocks } from '../grpc/stock.grpc-client';

const EMPTY_FINANCIALS = { revenue: 0, operatingProfit: 0, netIncome: 0, per: 0, pbr: 0, roe: 0 };

export class GrpcMarketProvider implements MarketProvider {
  async listStocks(filter: StockListFilter): Promise<Quote[]> {
    const page = await grpcSearchStocks(toSearchQuery(filter));
    return page.items.map(summaryToQuote);
  }

  async getStock(symbol: string): Promise<StockDetail | undefined> {
    const detail = await grpcGetStock(symbol);
    return detail ? catalogToStockDetail(detail) : undefined;
  }

  getCandles(symbol: string, interval: '1d' | '1w' | '1M', limit: number): Promise<Candle[]> {
    return grpcGetCandles(symbol, interval, limit);
  }

  // 시세/뉴스/무버스 백엔드 미구현 — 500 대신 빈 결과.
  async getNews(): Promise<NewsItem[]> {
    return [];
  }

  async getMovers(): Promise<MarketMovers> {
    return { gainers: [], losers: [], mostActive: [] };
  }
}

function toSearchQuery(filter: StockListFilter): StockSearchQuery {
  const query: StockSearchQuery = { page: 0, size: filter.limit ?? 100 };
  if (filter.q) query.q = filter.q;
  if (filter.exchange === 'KOSPI' || filter.exchange === 'KOSDAQ') query.market = filter.exchange;
  if (filter.sector) query.sector = filter.sector;
  return query;
}

// 카탈로그(가격 없음) → Quote. 시세 필드는 0, 시각은 응답 시점.
function summaryToQuote(s: StockSummary): Quote {
  return {
    symbol: s.code,
    name: s.name,
    exchange: s.market === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI',
    currency: 'KRW',
    sector: s.sector ?? '',
    price: 0,
    change: 0,
    changePercent: 0,
    prevClose: 0,
    open: 0,
    high: 0,
    low: 0,
    volume: 0,
    marketCap: s.marketCap ?? 0,
    updatedAt: new Date().toISOString(),
  };
}

function catalogToStockDetail(detail: StockCatalogDetail): StockDetail {
  const f = detail.financials;
  return {
    ...summaryToQuote(detail),
    high52w: 0,
    low52w: 0,
    description: detail.description ?? '',
    financials: f
      ? {
          revenue: f.revenue,
          operatingProfit: f.operatingProfit,
          netIncome: f.netIncome,
          per: f.per,
          pbr: f.pbr,
          roe: f.roe,
        }
      : { ...EMPTY_FINANCIALS },
  };
}
