import { Type, type Static } from '@sinclair/typebox';
import { Currency } from './common';

/** Account lifecycle status. Set to `inactive` when the Auth service emits a 탈퇴 event. */
export const AccountStatus = Type.Union([Type.Literal('active'), Type.Literal('inactive')]);
export type AccountStatus = Static<typeof AccountStatus>;

/** A user's virtual trading account summary (drives the dashboard stat cards). */
export const Account = Type.Object(
  {
    accountId: Type.String(),
    userId: Type.String(),
    status: AccountStatus,
    currency: Currency,
    cash: Type.Number({ description: '가용 가능 금액 (주문 가능 현금)' }),
    lockedAmount: Type.Number({ description: '묶인 금액 (미체결 주문 등으로 예약된 현금)' }),
    totalAsset: Type.Number({ description: '총 자산 = 평가금액 + 현금(가용+묶인)' }),
    investedAmount: Type.Number({ description: '주식 평가금액 (현금 제외)' }),
    totalProfitLoss: Type.Number(),
    totalReturnPercent: Type.Number(),
    todayProfitLoss: Type.Number(),
    todayReturnPercent: Type.Number(),
    rank: Type.Number(),
    updatedAt: Type.String({ format: 'date-time' }),
  },
);
export type Account = Static<typeof Account>;

/** Cash balance broken down into total / locked / available (ACC-004). */
export const AccountBalance = Type.Object(
  {
    totalBalance: Type.Number({ description: '총 잔고 = 가용 + 묶인' }),
    lockedAmount: Type.Number({ description: '묶인 금액 (미체결 주문 등)' }),
    availableAmount: Type.Number({ description: '가용 가능 금액' }),
  },
);
export type AccountBalance = Static<typeof AccountBalance>;

/** A position the user currently holds. */
export const Holding = Type.Object(
  {
    symbol: Type.String(),
    name: Type.String(),
    sector: Type.String(),
    quantity: Type.Number(),
    avgPrice: Type.Number({ description: '평균 매입 단가' }),
    currentPrice: Type.Number(),
    costBasis: Type.Number({ description: '매입 금액 = quantity * avgPrice' }),
    totalValue: Type.Number({ description: '평가 금액 = quantity * currentPrice' }),
    profitLoss: Type.Number(),
    profitLossPercent: Type.Number(),
  },
);
export type Holding = Static<typeof Holding>;

export const TransactionType = Type.Union([Type.Literal('buy'), Type.Literal('sell')]);
export type TransactionType = Static<typeof TransactionType>;

export const TransactionStatus = Type.Union(
  [Type.Literal('filled'), Type.Literal('pending'), Type.Literal('cancelled')],
);
export type TransactionStatus = Static<typeof TransactionStatus>;

export const Transaction = Type.Object(
  {
    id: Type.String(),
    type: TransactionType,
    symbol: Type.String(),
    name: Type.String(),
    quantity: Type.Number(),
    price: Type.Number({ description: 'Execution price per share' }),
    amount: Type.Number({ description: 'quantity * price (체결 금액)' }),
    fee: Type.Number(),
    status: TransactionStatus,
    executedAt: Type.String({ format: 'date-time' }),
  },
);
export type Transaction = Static<typeof Transaction>;

/** A single point on the portfolio value timeline. */
export const PortfolioPoint = Type.Object(
  {
    date: Type.String(),
    value: Type.Number(),
  },
);
export type PortfolioPoint = Static<typeof PortfolioPoint>;

/** Portfolio breakdown by sector (color is intentionally left to the frontend). */
export const SectorAllocation = Type.Object(
  {
    sector: Type.String(),
    value: Type.Number(),
    percent: Type.Number(),
  },
);
export type SectorAllocation = Static<typeof SectorAllocation>;

// ── Request schemas ────────────────────────────────────────────────
export const PlaceOrderBody = Type.Object({
  symbol: Type.String(),
  type: TransactionType,
  quantity: Type.Integer({ minimum: 1 }),
  /** Optional limit price; when omitted the order fills at the current market price. */
  price: Type.Optional(Type.Number({ minimum: 0 })),
});
export type PlaceOrderBody = Static<typeof PlaceOrderBody>;

export const PortfolioHistoryQuery = Type.Object({
  days: Type.Optional(Type.Integer({ minimum: 1, maximum: 365 })),
});
export type PortfolioHistoryQuery = Static<typeof PortfolioHistoryQuery>;

export const TransactionQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  type: Type.Optional(TransactionType),
});
export type TransactionQuery = Static<typeof TransactionQuery>;

// ── Order cancel ───────────────────────────────────────────────────
/** Result of cancelling an order. The original order isn't stored yet, so we
 * return a focused result object rather than a full {@link Transaction}. */
export const OrderCancelResult = Type.Object({
  id: Type.String(),
  status: Type.Literal('cancelled'),
  cancelledAt: Type.String({ format: 'date-time' }),
});
export type OrderCancelResult = Static<typeof OrderCancelResult>;

// ── Watchlist (관심종목) ────────────────────────────────────────────
export const WatchlistItem = Type.Object({
  symbol: Type.String(),
  name: Type.String(),
  addedAt: Type.String({ format: 'date-time' }),
});
export type WatchlistItem = Static<typeof WatchlistItem>;

export const AddWatchlistBody = Type.Object({ symbol: Type.String() });
export type AddWatchlistBody = Static<typeof AddWatchlistBody>;

export const WatchlistSymbolParams = Type.Object({ symbol: Type.String() });
export type WatchlistSymbolParams = Static<typeof WatchlistSymbolParams>;
