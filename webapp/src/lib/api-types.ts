/**
 * Canonical API data contracts, shared with the BFF via `@candle/shared`.
 *
 * These are type-only re-exports, so the TypeBox runtime is never bundled into
 * the client. Use them when wiring pages/stores up to the BFF, e.g.:
 *
 *   import type { Quote, Account } from '@/lib/api-types';
 */
export type {
  // market
  Quote,
  Candle,
  CandleInterval,
  StockDetail,
  StockFinancials,
  NewsItem,
  MarketMovers,
  // account
  Account,
  Holding,
  Transaction,
  TransactionType,
  PortfolioPoint,
  SectorAllocation,
  // social
  RankingEntry,
  Mission,
  MissionCategory,
  LearnContent,
  LearnLevel,
  // user
  UserProfile,
  AuthResponse,
  // common
  Exchange,
  Currency,
} from '@candle/shared';
