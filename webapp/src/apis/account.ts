/** Virtual trading account endpoints (`/api/account/*`). */
import type {
  Account,
  AccountBalance,
  Holding,
  OrderCancelResult,
  OrderKind,
  PortfolioPoint,
  Quote,
  SectorAllocation,
  Transaction,
  TransactionStatus,
  TransactionType,
  WatchlistItem,
} from '@/lib/api-types';
import { apiClient } from './client';

/** 계좌 요약 (대시보드 통계). */
export function getAccount(): Promise<Account> {
  return apiClient.get<Account>('/api/account');
}

/** 잔고 분리 조회 (총/묶인/가용). */
export function getAccountBalance(): Promise<AccountBalance> {
  return apiClient.get<AccountBalance>('/api/account/balance');
}

/** 예약(미체결) 주문 — 묶인 금액 내역. */
export function getReservations(): Promise<Transaction[]> {
  return apiClient.get<Transaction[]>('/api/account/reservations');
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
  /** 시장가/지정가 (ORD-002/003). 생략 시 market. */
  orderKind?: OrderKind;
  quantity: number;
  /** 지정가 가격(정수). market이면 무시. */
  price?: number;
}

/** 매수/매도 주문 (시장가/지정가). */
export function placeOrder(input: PlaceOrderInput): Promise<Transaction> {
  return apiClient.post<Transaction>('/api/account/orders', input);
}

/** 주문 목록 조회 (ORD-004). */
export function getOrders(params: { status?: TransactionStatus; symbol?: string } = {}): Promise<Transaction[]> {
  return apiClient.get<Transaction[]>('/api/account/orders', { ...params });
}

/** 주문 상세 조회 (ORD-005). */
export function getOrder(id: string): Promise<Transaction> {
  return apiClient.get<Transaction>(`/api/account/orders/${encodeURIComponent(id)}`);
}

/** 주문 취소. */
export function cancelOrder(id: string): Promise<OrderCancelResult> {
  return apiClient.del<OrderCancelResult>(`/api/account/orders/${encodeURIComponent(id)}`);
}

/** 계정 초기화 (포트폴리오 리셋). */
export function resetAccount(): Promise<Account> {
  return apiClient.post<Account>('/api/account/reset');
}

/** 계좌 비활성화 (Auth 탈퇴 이벤트 처리 — mock). */
export function deactivateAccount(): Promise<Account> {
  return apiClient.post<Account>('/api/account/deactivate');
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
