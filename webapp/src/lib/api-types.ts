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
  AccountStatus,
  AccountBalance,
  Holding,
  Transaction,
  TransactionType,
  PortfolioPoint,
  SectorAllocation,
  OrderCancelResult,
  WatchlistItem,
  AddWatchlistBody,
  // social
  RankingEntry,
  Mission,
  MissionCategory,
  ClaimRewardResult,
  MissionProgressBody,
  LearnContent,
  LearnLevel,
  LearnProgressResult,
  // user
  UserProfile,
  AuthResponse,
  InvestStyle,
  UpdateProfileBody,
  // common
  Exchange,
  Currency,
} from '@candle/shared';
