/** Stock catalog endpoints (`/api/stocks/*`) — stock-service 소유(기준정보/검색). */
import type { StockCatalogDetail, StockPage, StockSearchQuery } from '@/lib/api-types';
import { apiClient } from './client';

export interface LiveMarketStock {
  code: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

export interface LiveMarketStockPage {
  items: LiveMarketStock[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export function getLiveMarketStocks(params: { market?: string; page?: number; size?: number } = {}): Promise<LiveMarketStockPage> {
  const query = new URLSearchParams();
  if (params.market) query.set('market', params.market);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.size !== undefined) query.set('size', String(params.size));
  return fetch(`/api/market-stocks?${query}`, { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error(`종목 조회 실패 (${response.status})`);
    return response.json() as Promise<LiveMarketStockPage>;
  });
}

/** 종목 목록/검색 (서버 페이징 + 조건검색). */
export function searchStocks(params: StockSearchQuery = {}): Promise<StockPage> {
  return apiClient.get<StockPage>('/api/stocks', { ...params });
}

/** 종목 상세 (없으면 서버가 키움 fallback 시도). */
export function getStockCatalog(code: string): Promise<StockCatalogDetail> {
  return apiClient.get<StockCatalogDetail>(`/api/stocks/${encodeURIComponent(code)}`);
}
