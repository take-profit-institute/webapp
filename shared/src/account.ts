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
    realizedProfit: Type.Number({ description: '누적 실현손익 (HLD-007)' }),
    isActive: Type.Boolean({ description: '보유 활성 여부. 수량 0이면 false (HLD-008)' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
);
export type Holding = Static<typeof Holding>;

export const HoldingListQuery = Type.Object({
  includeInactive: Type.Optional(Type.Boolean({ description: '과거 보유 이력 포함 여부 (HLD-012)' })),
});
export type HoldingListQuery = Static<typeof HoldingListQuery>;

export const HoldingSymbolParams = Type.Object({ symbol: Type.String() });
export type HoldingSymbolParams = Static<typeof HoldingSymbolParams>;

export const TransactionType = Type.Union([Type.Literal('buy'), Type.Literal('sell')]);
export type TransactionType = Static<typeof TransactionType>;

export const TransactionStatus = Type.Union(
  [Type.Literal('filled'), Type.Literal('pending'), Type.Literal('cancelled')],
);
export type TransactionStatus = Static<typeof TransactionStatus>;

/** 주문 유형: 시장가(market) / 지정가(limit) (ORD-002/003). */
export const OrderKind = Type.Union([Type.Literal('market'), Type.Literal('limit')]);
export type OrderKind = Static<typeof OrderKind>;

export const Transaction = Type.Object(
  {
    id: Type.String(),
    type: TransactionType,
    orderKind: Type.Optional(OrderKind),
    parentOrderId: Type.Optional(Type.String({ description: '정정 주문인 경우 원 주문 ID (CAN-008)' })),
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
  /** 시장가/지정가 (ORD-002/003). 생략 시 market. */
  orderKind: Type.Optional(OrderKind),
  /** 주문 수량 — 1주 단위 (ORD-010). */
  quantity: Type.Integer({ minimum: 1 }),
  /** 지정가 가격(정수, ORD-011). market이면 무시되고 현재가로 체결. */
  price: Type.Optional(Type.Number({ minimum: 0 })),
});
export type PlaceOrderBody = Static<typeof PlaceOrderBody>;

/** 주문 목록 조회 필터 (ORD-004). */
export const OrderListQuery = Type.Object({
  status: Type.Optional(TransactionStatus),
  symbol: Type.Optional(Type.String()),
});
export type OrderListQuery = Static<typeof OrderListQuery>;

export const OrderIdParams = Type.Object({ id: Type.String() });
export type OrderIdParams = Static<typeof OrderIdParams>;

export const AmendOrderBody = Type.Object({
  quantity: Type.Integer({ minimum: 1 }),
  price: Type.Number({ minimum: 0 }),
});
export type AmendOrderBody = Static<typeof AmendOrderBody>;

// ── 예약 주문 (RSV-*) ───────────────────────────────────────────────
/** 예약 실행 시점 (RSV-001): 시가(09:00) / 전일종가(08:30) / 당일종가(15:40). */
export const ReservationTiming = Type.Union([
  Type.Literal('open'), // 시가
  Type.Literal('prev_close'), // 전일종가
  Type.Literal('today_close'), // 당일종가
]);
export type ReservationTiming = Static<typeof ReservationTiming>;

/**
 * 예약 주문 유형:
 * - 시가 예약 → market | limit (RSV-002)
 * - 전일/당일 종가 예약 → after_hours_close (시간외종가, RSV-003)
 */
export const ReservationKind = Type.Union([
  Type.Literal('market'),
  Type.Literal('limit'),
  Type.Literal('after_hours_close'),
]);
export type ReservationKind = Static<typeof ReservationKind>;

/** 예약 상태: 접수(reserved) → 전환(pending)/체결(filled)/취소(cancelled). */
export const ReservationStatus = Type.Union([
  Type.Literal('reserved'),
  Type.Literal('pending'),
  Type.Literal('filled'),
  Type.Literal('cancelled'),
]);
export type ReservationStatus = Static<typeof ReservationStatus>;

export const Reservation = Type.Object(
  {
    id: Type.String(),
    symbol: Type.String(),
    name: Type.String(),
    type: TransactionType,
    timing: ReservationTiming,
    orderKind: ReservationKind,
    parentOrderId: Type.Optional(Type.String({ description: '정정 예약인 경우 원 예약 주문 ID (CAN-008)' })),
    quantity: Type.Number(),
    price: Type.Optional(Type.Number({ description: '지정가일 때만' })),
    scheduledDate: Type.String({ description: '실행 예정일 (YYYY-MM-DD)' }),
    amount: Type.Number({ description: '예상 체결 금액' }),
    fee: Type.Number(),
    status: ReservationStatus,
    createdAt: Type.String({ format: 'date-time' }),
  },
);
export type Reservation = Static<typeof Reservation>;

export const CreateReservationBody = Type.Object({
  symbol: Type.String(),
  type: TransactionType,
  timing: ReservationTiming,
  orderKind: ReservationKind,
  quantity: Type.Integer({ minimum: 1 }),
  /** 시가+지정가일 때 필수(정수). */
  price: Type.Optional(Type.Number({ minimum: 0 })),
  /** 시가/당일종가 예약 시 실행 예정일 (내일~+7일). 전일종가는 내일 고정이라 무시됨. */
  scheduledDate: Type.Optional(Type.String()),
});
export type CreateReservationBody = Static<typeof CreateReservationBody>;

export const ReservationListQuery = Type.Object({
  status: Type.Optional(ReservationStatus),
});
export type ReservationListQuery = Static<typeof ReservationListQuery>;

export const ReservationIdParams = Type.Object({ id: Type.String() });
export type ReservationIdParams = Static<typeof ReservationIdParams>;

export const AmendReservationBody = Type.Object({
  timing: Type.Optional(ReservationTiming),
  orderKind: Type.Optional(ReservationKind),
  quantity: Type.Optional(Type.Integer({ minimum: 1 })),
  price: Type.Optional(Type.Number({ minimum: 0 })),
  scheduledDate: Type.Optional(Type.String()),
});
export type AmendReservationBody = Static<typeof AmendReservationBody>;

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
  releasedAmount: Type.Number({ description: '취소로 반환되는 예약 금액(amount + fee)' }),
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
