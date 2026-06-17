/** Virtual trading account endpoints (`/api/account/*`). */
import type {
  Account,
  Holding,
  OrderCancelResult,
  PortfolioPoint,
  Quote,
  SectorAllocation,
  Transaction,
  TransactionType,
  WatchlistItem,
} from '@/lib/api-types';
import { apiClient } from './client';

/** 계좌 요약 (대시보드 통계). */
export function getAccount(): Promise<Account> {
  return apiClient.get<Account>('/api/account');
}

/** 보유 종목. */
export function getHoldings(): Promise<Holding[]> {
  return apiClient.get<Holding[]>('/api/account/holdings');
}

/** 거래 내역. */
export function getTransactions(
  params: { limit?: number; type?: TransactionType } = {},
): Promise<Transaction[]> {
  return apiClient.get<Transaction[]>('/api/account/transactions', { ...params });
}

/** 포트폴리오 자산 추이. */
export function getPortfolioHistory(days?: number): Promise<PortfolioPoint[]> {
  return apiClient.get<PortfolioPoint[]>('/api/account/portfolio-history', { days });
}

/** 섹터별 자산 구성. */
export function getAllocation(): Promise<SectorAllocation[]> {
  return apiClient.get<SectorAllocation[]>('/api/account/allocation');
}

export interface PlaceOrderInput {
  symbol: string;
  type: TransactionType;
  quantity: number;
  /** Optional limit price; omit to fill at the current market price. */
  price?: number;
}

/** 매수/매도 주문 (모의 체결). */
export function placeOrder(input: PlaceOrderInput): Promise<Transaction> {
  return apiClient.post<Transaction>('/api/account/orders', input);
}

/** 주문 취소. */
export function cancelOrder(id: string): Promise<OrderCancelResult> {
  return apiClient.del<OrderCancelResult>(`/api/account/orders/${encodeURIComponent(id)}`);
}

/** 계정 초기화 (포트폴리오 리셋). */
export function resetAccount(): Promise<Account> {
  return apiClient.post<Account>('/api/account/reset');
}

/** 관심종목 목록. */
export function getWatchlist(): Promise<Quote[]> {
  return apiClient.get<Quote[]>('/api/account/watchlist');
}

/** 관심종목 추가. */
export function addWatchlist(symbol: string): Promise<WatchlistItem> {
  return apiClient.post<WatchlistItem>('/api/account/watchlist', { symbol });
}

/** 관심종목 제거. */
export function removeWatchlist(symbol: string): Promise<void> {
  return apiClient.del(`/api/account/watchlist/${encodeURIComponent(symbol)}`);
}
