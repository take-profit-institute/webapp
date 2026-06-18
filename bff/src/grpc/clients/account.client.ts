/**
 * AccountService gRPC client stub.
 * Owns: cash balance, orders (place/cancel), holdings, transactions, watchlist, account reset.
 * Portfolio analytics (history, allocation) live in PortfolioService.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export interface AccountInfo {
  userId: string;
  cash: number;
  totalAsset: number;
  investedAmount: number;
  totalProfitLoss: number;
  totalReturnPercent: number;
  todayProfitLoss: number;
  todayReturnPercent: number;
  rank: number;
  status: 'active' | 'inactive';
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface Transaction {
  id: string;
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  amount: number;
  executedAt: string;
  status: 'pending' | 'executed' | 'cancelled';
}

export interface PlaceOrderRequest {
  userId: string;
  symbol: string;
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  limitPrice?: number;
  idempotencyKey: string;
}

export interface TransactionFilter {
  userId: string;
  limit?: number;
  offset?: number;
  type?: 'buy' | 'sell';
}

export interface AccountServiceClient {
  getAccount(req: { userId: string }, opts?: GrpcCallOptions): Promise<AccountInfo>;
  getHoldings(req: { userId: string }, opts?: GrpcCallOptions): Promise<Holding[]>;
  getTransactions(req: TransactionFilter, opts?: GrpcCallOptions): Promise<Transaction[]>;
  placeOrder(req: PlaceOrderRequest, opts?: GrpcCallOptions): Promise<Transaction>;
  cancelOrder(req: { userId: string; orderId: string }, opts?: GrpcCallOptions): Promise<void>;
  resetAccount(req: { userId: string }, opts?: GrpcCallOptions): Promise<AccountInfo>;
  getWatchlist(req: { userId: string }, opts?: GrpcCallOptions): Promise<string[]>;
  addToWatchlist(req: { userId: string; symbol: string }, opts?: GrpcCallOptions): Promise<void>;
  removeFromWatchlist(req: { userId: string; symbol: string }, opts?: GrpcCallOptions): Promise<void>;
}

class StubAccountServiceClient implements AccountServiceClient {
  getAccount(): Promise<AccountInfo> { return notImplemented('AccountService', 'getAccount'); }
  getHoldings(): Promise<Holding[]> { return notImplemented('AccountService', 'getHoldings'); }
  getTransactions(): Promise<Transaction[]> { return notImplemented('AccountService', 'getTransactions'); }
  placeOrder(): Promise<Transaction> { return notImplemented('AccountService', 'placeOrder'); }
  cancelOrder(): Promise<void> { return notImplemented('AccountService', 'cancelOrder'); }
  resetAccount(): Promise<AccountInfo> { return notImplemented('AccountService', 'resetAccount'); }
  getWatchlist(): Promise<string[]> { return notImplemented('AccountService', 'getWatchlist'); }
  addToWatchlist(): Promise<void> { return notImplemented('AccountService', 'addToWatchlist'); }
  removeFromWatchlist(): Promise<void> { return notImplemented('AccountService', 'removeFromWatchlist'); }
}

export function createAccountServiceClient(_channel: GrpcChannel): AccountServiceClient {
  return new StubAccountServiceClient();
}
