/**
 * PortfolioService gRPC client stub.
 * Owns: portfolio history, asset allocation, performance analytics.
 * Sourced from CDC projections of AccountService events — read-only from BFF perspective.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

export interface AllocationItem {
  sector: string;
  percent: number;
  amount: number;
}

export interface PerformanceSummary {
  totalReturnPercent: number;
  totalProfitLoss: number;
  winRate: number;
  avgHoldingDays: number;
  bestSymbol: string;
  bestReturnPercent: number;
  worstSymbol: string;
  worstReturnPercent: number;
}

export interface MonthlyReturn {
  month: string;
  returnPercent: number;
}

export interface PortfolioServiceClient {
  getHistory(req: { userId: string; days: number }, opts?: GrpcCallOptions): Promise<PortfolioHistoryPoint[]>;
  getAllocation(req: { userId: string }, opts?: GrpcCallOptions): Promise<AllocationItem[]>;
  getPerformance(req: { userId: string }, opts?: GrpcCallOptions): Promise<PerformanceSummary>;
  getMonthlyReturns(req: { userId: string; months: number }, opts?: GrpcCallOptions): Promise<MonthlyReturn[]>;
}

class StubPortfolioServiceClient implements PortfolioServiceClient {
  getHistory(): Promise<PortfolioHistoryPoint[]> { return notImplemented('PortfolioService', 'getHistory'); }
  getAllocation(): Promise<AllocationItem[]> { return notImplemented('PortfolioService', 'getAllocation'); }
  getPerformance(): Promise<PerformanceSummary> { return notImplemented('PortfolioService', 'getPerformance'); }
  getMonthlyReturns(): Promise<MonthlyReturn[]> { return notImplemented('PortfolioService', 'getMonthlyReturns'); }
}

export function createPortfolioServiceClient(_channel: GrpcChannel): PortfolioServiceClient {
  return new StubPortfolioServiceClient();
}
