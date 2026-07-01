/** Stock catalog endpoints (`/api/stocks/*`) — stock-service 소유(기준정보/검색). */
import type { StockCatalogDetail, StockPage, StockSearchQuery } from '@/lib/api-types';
import { apiClient } from './client';

/** 종목 목록/검색 (서버 페이징 + 조건검색). */
export function searchStocks(params: StockSearchQuery = {}): Promise<StockPage> {
  return apiClient.get<StockPage>('/api/stocks', { ...params });
}

/** 종목 상세 (없으면 서버가 키움 fallback 시도). */
export function getStockCatalog(code: string): Promise<StockCatalogDetail> {
  return apiClient.get<StockCatalogDetail>(`/api/stocks/${encodeURIComponent(code)}`);
}
