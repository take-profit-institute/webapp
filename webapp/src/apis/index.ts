/**
 * Candle BFF client — single entry point for all backend requests.
 *
 *   import { getStocks, getAccount, useApi } from '@/apis';
 *
 * Modules are namespaced to avoid name clashes (both market and account expose
 * symbol-ish helpers), and the most-used functions are also re-exported flat.
 */
export * as marketApi from './market';
export * as accountApi from './account';
export * as authApi from './auth';
export * as socialApi from './social';

export { API_BASE_URL, ApiError, apiClient } from './client';
export { useApi } from './useApi';
export type { UseApiResult } from './useApi';

// Flat re-exports for the common calls.
export {
  MARKET_SYMBOLS,
  getStocks,
  getMovers,
  getStock,
  getCandles,
  getStockNews,
} from './market';
export {
  getAccount,
  getHoldings,
  getTransactions,
  getPortfolioHistory,
  getAllocation,
  placeOrder,
} from './account';
export { login, signup, getMe } from './auth';
export { getRankings, getMyRanking, getMissions, getLearnContents, getLearnContent } from './social';
