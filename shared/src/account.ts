import { Type, type Static } from '@sinclair/typebox';
import { Currency } from './common';

/** A user's virtual trading account summary (drives the dashboard stat cards). */
export const Account = Type.Object(
  {
    accountId: Type.String(),
    userId: Type.String(),
    currency: Currency,
    cash: Type.Number({ description: '가용 현금' }),
    totalAsset: Type.Number({ description: '총 자산 = 평가금액 + 현금' }),
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
