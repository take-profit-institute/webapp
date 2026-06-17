import type {
  Account,
  AccountBalance,
  Holding,
  PortfolioPoint,
  Reservation,
  ReservationKind,
  ReservationTiming,
  SectorAllocation,
  Transaction,
} from '@candle/shared';

export const DEMO_USER_ID = 'u_demo';
export const DEMO_ACCOUNT_ID = 'acc_demo';

const STARTING_CAPITAL = 100_000_000;

export const holdings: Holding[] = [
  { symbol: '005930', name: '삼성전자', sector: '반도체', quantity: 50, avgPrice: 68200, currentPrice: 71400, costBasis: 3410000, totalValue: 3570000, profitLoss: 160000, profitLossPercent: 4.69, realizedProfit: 0, isActive: true, updatedAt: '2026-06-15T15:30:00+09:00' },
  { symbol: 'NVDA', name: '엔비디아', sector: '반도체', quantity: 3, avgPrice: 820000, currentPrice: 875200, costBasis: 2460000, totalValue: 2625600, profitLoss: 165600, profitLossPercent: 6.73, realizedProfit: 0, isActive: true, updatedAt: '2026-06-15T15:30:00+09:00' },
  { symbol: '000660', name: 'SK하이닉스', sector: '반도체', quantity: 15, avgPrice: 210000, currentPrice: 198500, costBasis: 3150000, totalValue: 2977500, profitLoss: -172500, profitLossPercent: -5.48, realizedProfit: 0, isActive: true, updatedAt: '2026-06-15T15:30:00+09:00' },
  { symbol: 'AAPL', name: '애플', sector: '기술', quantity: 8, avgPrice: 182000, currentPrice: 189840, costBasis: 1456000, totalValue: 1518720, profitLoss: 62720, profitLossPercent: 4.31, realizedProfit: 0, isActive: true, updatedAt: '2026-06-15T15:30:00+09:00' },
  { symbol: '035420', name: 'NAVER', sector: 'IT', quantity: 20, avgPrice: 175000, currentPrice: 168000, costBasis: 3500000, totalValue: 3360000, profitLoss: -140000, profitLossPercent: -4.0, realizedProfit: 0, isActive: true, updatedAt: '2026-06-15T15:30:00+09:00' },
  { symbol: '373220', name: 'LG에너지솔루션', sector: '배터리', quantity: 10, avgPrice: 295000, currentPrice: 312000, costBasis: 2950000, totalValue: 3120000, profitLoss: 170000, profitLossPercent: 5.76, realizedProfit: 0, isActive: true, updatedAt: '2026-06-15T15:30:00+09:00' },
  { symbol: 'TSLA', name: '테슬라', sector: '자동차', quantity: 0, avgPrice: 245000, currentPrice: 248000, costBasis: 0, totalValue: 0, profitLoss: 0, profitLossPercent: 0, realizedProfit: 6000, isActive: false, updatedAt: '2026-06-14T15:48:00+09:00' },
];

export function recalcHolding(h: Holding, currentPrice = h.currentPrice): Holding {
  const costBasis = h.quantity * h.avgPrice;
  const totalValue = h.quantity * currentPrice;
  const profitLoss = totalValue - costBasis;
  return {
    ...h,
    currentPrice,
    costBasis,
    totalValue,
    profitLoss,
    profitLossPercent: costBasis > 0 ? Math.round((profitLoss / costBasis) * 10000) / 100 : 0,
  };
}

export function applyFilledOrderToHoldings(order: Transaction, stock: { name: string; sector: string; price: number }): Holding {
  const existing = holdings.find((h) => h.symbol === order.symbol);
  const now = order.executedAt;

  if (order.type === 'buy') {
    if (!existing) {
      const created = recalcHolding({
        symbol: order.symbol,
        name: stock.name,
        sector: stock.sector,
        quantity: order.quantity,
        avgPrice: order.price,
        currentPrice: stock.price,
        costBasis: 0,
        totalValue: 0,
        profitLoss: 0,
        profitLossPercent: 0,
        realizedProfit: 0,
        isActive: true,
        updatedAt: now,
      }, stock.price);
      holdings.unshift(created);
      return created;
    }

    if (!existing.isActive) {
      existing.quantity = order.quantity;
      existing.avgPrice = order.price;
      existing.realizedProfit = 0;
      existing.isActive = true;
    } else {
      const nextQuantity = existing.quantity + order.quantity;
      existing.avgPrice = Math.round(((existing.quantity * existing.avgPrice) + (order.quantity * order.price)) / nextQuantity);
      existing.quantity = nextQuantity;
    }
    existing.name = stock.name;
    existing.sector = stock.sector;
    existing.updatedAt = now;
    Object.assign(existing, recalcHolding(existing, stock.price));
    return existing;
  }

  if (!existing) {
    throw new Error(`Holding not found for sell: ${order.symbol}`);
  }
  existing.realizedProfit += Math.round((order.price - existing.avgPrice) * order.quantity);
  existing.quantity = Math.max(0, existing.quantity - order.quantity);
  if (existing.quantity === 0) existing.isActive = false;
  existing.updatedAt = now;
  Object.assign(existing, recalcHolding(existing, stock.price));
  return existing;
}

function tx(
  id: string,
  type: 'buy' | 'sell',
  symbol: string,
  name: string,
  quantity: number,
  price: number,
  executedAt: string,
): Transaction {
  const amount = quantity * price;
  return { id, type, symbol, name, quantity, price, amount, fee: Math.round(amount * 0.00015), status: 'filled', executedAt };
}

export const transactions: Transaction[] = [
  tx('t1', 'buy', '005930', '삼성전자', 10, 71200, '2026-06-15T09:32:00+09:00'),
  tx('t2', 'sell', 'TSLA', '테슬라', 2, 248000, '2026-06-14T15:48:00+09:00'),
  tx('t3', 'buy', 'NVDA', '엔비디아', 1, 868000, '2026-06-13T10:15:00+09:00'),
  tx('t4', 'buy', '373220', 'LG에너지솔루션', 5, 308000, '2026-06-12T11:22:00+09:00'),
  tx('t5', 'sell', '035420', 'NAVER', 10, 172000, '2026-06-11T14:07:00+09:00'),
  tx('t6', 'buy', 'AAPL', '애플', 3, 185000, '2026-06-10T09:45:00+09:00'),
];

/** 미체결 지정가 주문 — 체결 대기로 현금이 '묶인' 예약 건. lockedAmount의 출처. */
export const reservations: Transaction[] = [
  { ...tx('r1', 'buy', '000660', 'SK하이닉스', 3, 198500, '2026-06-15T14:05:00+09:00'), orderKind: 'limit', status: 'pending' },
  { ...tx('r2', 'buy', '035720', '카카오', 6, 39450, '2026-06-15T13:20:00+09:00'), orderKind: 'limit', status: 'pending' },
];
const BASE_CASH = 2_125_780;
const INITIAL_LOCKED_AMOUNT = reservations.reduce((sum, r) => sum + r.amount + r.fee, 0);

/** 묶인 금액 = 미체결 주문이 예약한 금액(체결금액 + 수수료)의 합. */
export function getLockedAmount(): number {
  return reservations
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount + r.fee, 0);
}

// ── 예약 주문 (RSV-*) ───────────────────────────────────────────────
/** YYYY-MM-DD (오늘 + offset일). */
function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/** 시점별 허용 주문 유형 (RSV-002/003). */
export function allowedReservationKinds(timing: ReservationTiming): ReservationKind[] {
  return timing === 'open' ? ['market', 'limit'] : ['after_hours_close'];
}

/**
 * 예약 실행 예정일 결정 (RSV-004/005).
 * - prev_close: 내일 고정.
 * - open/today_close: 내일~+7일 범위. 범위 밖이면 null(거부).
 */
export function resolveScheduledDate(timing: ReservationTiming, requested?: string): string | null {
  const tomorrow = dateStr(1);
  if (timing === 'prev_close') return tomorrow;
  if (!requested) return null;
  const max = dateStr(7);
  if (requested < tomorrow || requested > max) return null;
  return requested;
}

/** 데모 예약 주문 시드 (RSV-009 목록용). */
export const demoReservations: Reservation[] = [
  {
    id: 'rsv1', symbol: '005930', name: '삼성전자', type: 'buy', timing: 'open', orderKind: 'limit',
    quantity: 10, price: 70000, scheduledDate: dateStr(1), amount: 700000, fee: 105,
    status: 'reserved', createdAt: new Date().toISOString(),
  },
  {
    id: 'rsv2', symbol: 'NVDA', name: '엔비디아', type: 'sell', timing: 'today_close', orderKind: 'after_hours_close',
    quantity: 2, price: 875200, scheduledDate: dateStr(2), amount: 1750400, fee: 262,
    status: 'reserved', createdAt: new Date().toISOString(),
  },
];

function seedRandom(seed: number) {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getPortfolioHistory(days = 30): PortfolioPoint[] {
  const points: PortfolioPoint[] = [];
  const start = new Date('2026-06-15');
  start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const rand = seedRandom(i + 100);
    const trend = i * 600000;
    const noise = (rand() - 0.45) * 3000000;
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    points.push({ date: d.toISOString().split('T')[0], value: Math.round(STARTING_CAPITAL + trend + noise) });
  }
  return points;
}

export const sectorAllocation: SectorAllocation[] = [
  { sector: '반도체', value: 9173100, percent: 38.0 },
  { sector: 'IT', value: 3360000, percent: 19.5 },
  { sector: '배터리', value: 3120000, percent: 18.1 },
  { sector: '기술', value: 1518720, percent: 11.7 },
  { sector: '현금', value: 2125780, percent: 12.7 },
];

export function getAccount(): Account {
  const investedAmount = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const cash = BASE_CASH + INITIAL_LOCKED_AMOUNT - getLockedAmount(); // 가용 가능 금액
  const totalAsset = 118_360_000;
  return {
    accountId: DEMO_ACCOUNT_ID,
    userId: DEMO_USER_ID,
    status: 'active',
    currency: 'KRW',
    cash,
    lockedAmount: getLockedAmount(), // 미체결 주문이 예약한 금액 (reservations 합계)
    totalAsset,
    investedAmount,
    totalProfitLoss: totalAsset - STARTING_CAPITAL,
    totalReturnPercent: Math.round(((totalAsset - STARTING_CAPITAL) / STARTING_CAPITAL) * 10000) / 100,
    todayProfitLoss: 285_600,
    todayReturnPercent: 0.24,
    rank: 4,
    updatedAt: '2026-06-15T15:30:00+09:00',
  };
}

/** Cash balance broken down into 총/묶인/가용 (ACC-004). */
export function getBalance(): AccountBalance {
  const account = getAccount();
  return {
    totalBalance: account.cash + account.lockedAmount,
    lockedAmount: account.lockedAmount,
    availableAmount: account.cash,
  };
}

/** A freshly reset account: all holdings sold, full starting capital in cash. */
export function getResetAccount(): Account {
  return {
    accountId: DEMO_ACCOUNT_ID,
    userId: DEMO_USER_ID,
    status: 'active',
    currency: 'KRW',
    cash: STARTING_CAPITAL,
    lockedAmount: 0,
    totalAsset: STARTING_CAPITAL,
    investedAmount: 0,
    totalProfitLoss: 0,
    totalReturnPercent: 0,
    todayProfitLoss: 0,
    todayReturnPercent: 0,
    rank: 4,
    updatedAt: new Date().toISOString(),
  };
}

/** Returns the demo account with status flipped to inactive (ACC-005, mock — not persisted). */
export function getDeactivatedAccount(): Account {
  return { ...getAccount(), status: 'inactive', updatedAt: new Date().toISOString() };
}

/** Seed symbols for the demo watchlist (관심종목). */
export const watchlistSymbols = ['005930', 'NVDA', '035420'];
