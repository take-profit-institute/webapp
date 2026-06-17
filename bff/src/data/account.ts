import type {
  Account,
  Holding,
  PortfolioPoint,
  SectorAllocation,
  Transaction,
} from '@candle/shared';

export const DEMO_USER_ID = 'u_demo';
export const DEMO_ACCOUNT_ID = 'acc_demo';

const STARTING_CAPITAL = 100_000_000;

export const holdings: Holding[] = [
  { symbol: '005930', name: '삼성전자', sector: '반도체', quantity: 50, avgPrice: 68200, currentPrice: 71400, costBasis: 3410000, totalValue: 3570000, profitLoss: 160000, profitLossPercent: 4.69 },
  { symbol: 'NVDA', name: '엔비디아', sector: '반도체', quantity: 3, avgPrice: 820000, currentPrice: 875200, costBasis: 2460000, totalValue: 2625600, profitLoss: 165600, profitLossPercent: 6.73 },
  { symbol: '000660', name: 'SK하이닉스', sector: '반도체', quantity: 15, avgPrice: 210000, currentPrice: 198500, costBasis: 3150000, totalValue: 2977500, profitLoss: -172500, profitLossPercent: -5.48 },
  { symbol: 'AAPL', name: '애플', sector: '기술', quantity: 8, avgPrice: 182000, currentPrice: 189840, costBasis: 1456000, totalValue: 1518720, profitLoss: 62720, profitLossPercent: 4.31 },
  { symbol: '035420', name: 'NAVER', sector: 'IT', quantity: 20, avgPrice: 175000, currentPrice: 168000, costBasis: 3500000, totalValue: 3360000, profitLoss: -140000, profitLossPercent: -4.0 },
  { symbol: '373220', name: 'LG에너지솔루션', sector: '배터리', quantity: 10, avgPrice: 295000, currentPrice: 312000, costBasis: 2950000, totalValue: 3120000, profitLoss: 170000, profitLossPercent: 5.76 },
];

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
  const cash = 2_125_780;
  const totalAsset = 118_360_000;
  return {
    accountId: DEMO_ACCOUNT_ID,
    userId: DEMO_USER_ID,
    currency: 'KRW',
    cash,
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

/** A freshly reset account: all holdings sold, full starting capital in cash. */
export function getResetAccount(): Account {
  return {
    accountId: DEMO_ACCOUNT_ID,
    userId: DEMO_USER_ID,
    currency: 'KRW',
    cash: STARTING_CAPITAL,
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

/** Seed symbols for the demo watchlist (관심종목). */
export const watchlistSymbols = ['005930', 'NVDA', '035420'];
