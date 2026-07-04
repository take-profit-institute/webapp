import type { Candle, MarketStatus, NewsItem, Quote, StockDetail, StockFinancials } from '@candle/shared';
import type { Currency, Exchange } from '@candle/shared';
import { env } from '../config/env';
import { grpcGetMarketStatus } from '../grpc/market.grpc-client';

/**
 * 로컬 계산 폴백 — mock 데이터 소스이거나 market-service 미가용 시 사용.
 * 평일 09:00~15:30 KST를 정규장으로 본다(공휴일은 반영하지 못한다).
 */
export function computeLocalMarketStatus(): MarketStatus {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // KST = UTC+9
  const day = kst.getUTCDay(); // 0=일 .. 6=토
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const open = day >= 1 && day <= 5 && minutes >= 540 && minutes <= 930; // 09:00~15:30
  return {
    open,
    session: open ? 'regular' : 'closed',
    asOf: now.toISOString(),
    message: open ? undefined : '정규장 시간이 아닙니다 (평일 09:00~15:30 KST). 시장가 주문은 예약 주문으로 접수됩니다.',
  };
}

/**
 * 장 운영 상태 (ORD-012). grpc 모드에선 권위 소스(market-service MarketSession)에
 * 위임해 주말·공휴일까지 반영한다. market-service 미가용 시 로컬 계산으로 폴백한다.
 */
export async function getMarketStatus(): Promise<MarketStatus> {
  if (env.dataSource !== 'grpc') return computeLocalMarketStatus();
  try {
    return await grpcGetMarketStatus();
  } catch {
    return computeLocalMarketStatus();
  }
}

/** Deterministic PRNG so mock data is stable across requests (mirrors the frontend). */
function seedRandom(seed: number) {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function symbolSeed(symbol: string): number {
  return [...symbol].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || 42;
}

const FIXED_NOW = '2026-06-15T15:30:00+09:00';

interface BaseStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
  exchange: Exchange;
  volume: number;
  marketCap: number;
}

const KRW: Currency = 'KRW';
const USD: Currency = 'USD';

const 조 = 1_000_000_000_000;
const T = 1_000_000_000_000;
const B = 1_000_000_000;
const M = 1_000_000;
const K = 1_000;

const baseStocks: BaseStock[] = [
  { symbol: '005930', name: '삼성전자', price: 71400, change: 800, changePercent: 1.13, sector: '반도체', exchange: 'KOSPI', volume: 12.3 * M, marketCap: 426 * 조 },
  { symbol: '000660', name: 'SK하이닉스', price: 198500, change: -2500, changePercent: -1.24, sector: '반도체', exchange: 'KOSPI', volume: 3.8 * M, marketCap: 144 * 조 },
  { symbol: '373220', name: 'LG에너지솔루션', price: 312000, change: 4000, changePercent: 1.3, sector: '배터리', exchange: 'KOSPI', volume: 890 * K, marketCap: 73 * 조 },
  { symbol: '005380', name: '현대차', price: 215500, change: 1500, changePercent: 0.7, sector: '자동차', exchange: 'KOSPI', volume: 1.2 * M, marketCap: 46 * 조 },
  { symbol: '035420', name: 'NAVER', price: 168000, change: -3000, changePercent: -1.75, sector: 'IT', exchange: 'KOSPI', volume: 820 * K, marketCap: 27 * 조 },
  { symbol: '035720', name: '카카오', price: 39450, change: 650, changePercent: 1.67, sector: 'IT', exchange: 'KOSPI', volume: 4.1 * M, marketCap: 17 * 조 },
  { symbol: '068270', name: '셀트리온', price: 182000, change: -1500, changePercent: -0.82, sector: '바이오', exchange: 'KOSPI', volume: 680 * K, marketCap: 24 * 조 },
  { symbol: '207940', name: '삼성바이오로직스', price: 891000, change: 12000, changePercent: 1.36, sector: '바이오', exchange: 'KOSPI', volume: 210 * K, marketCap: 63 * 조 },
  { symbol: '006400', name: '삼성SDI', price: 274000, change: -5000, changePercent: -1.79, sector: '배터리', exchange: 'KOSPI', volume: 480 * K, marketCap: 18 * 조 },
  { symbol: '051910', name: 'LG화학', price: 294000, change: 2500, changePercent: 0.86, sector: '화학', exchange: 'KOSPI', volume: 350 * K, marketCap: 20 * 조 },
  { symbol: '091990', name: '셀트리온헬스케어', price: 56200, change: 400, changePercent: 0.72, sector: '바이오', exchange: 'KOSDAQ', volume: 2.1 * M, marketCap: 7.6 * 조 },
  { symbol: '247540', name: '에코프로비엠', price: 128500, change: -3500, changePercent: -2.65, sector: '배터리', exchange: 'KOSDAQ', volume: 1.5 * M, marketCap: 12 * 조 },
];

function currencyOf(exchange: Exchange): Currency {
  return exchange === 'KOSPI' || exchange === 'KOSDAQ' ? KRW : USD;
}

function toQuote(b: BaseStock): Quote {
  const rand = seedRandom(symbolSeed(b.symbol));
  const prevClose = b.price - b.change;
  const open = Math.round(prevClose + (rand() - 0.5) * Math.abs(b.change || b.price * 0.01));
  const high = Math.round(Math.max(b.price, open) * (1 + rand() * 0.012));
  const low = Math.round(Math.min(b.price, open) * (1 - rand() * 0.012));
  return {
    symbol: b.symbol,
    name: b.name,
    exchange: b.exchange,
    currency: currencyOf(b.exchange),
    sector: b.sector,
    price: b.price,
    change: b.change,
    changePercent: b.changePercent,
    prevClose,
    open,
    high,
    low,
    volume: Math.round(b.volume),
    marketCap: Math.round(b.marketCap),
    updatedAt: FIXED_NOW,
  };
}

export const quotes: Quote[] = baseStocks.map(toQuote);

const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

export function getQuote(symbol: string): Quote | undefined {
  return quoteBySymbol.get(symbol);
}

export function generateCandles(symbol: string, interval: '1d' | '1w' | '1M' = '1d', limit = 60): Candle[] {
  const quote = getQuote(symbol);
  if (!quote) return [];
  const rand = seedRandom(symbolSeed(symbol));
  const stepDays = interval === '1M' ? 30 : interval === '1w' ? 7 : 1;
  const candles: Candle[] = [];
  let price = quote.price * 0.85;
  const now = new Date(FIXED_NOW);

  for (let i = limit; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * stepDays);
    if (interval === '1d' && (date.getDay() === 0 || date.getDay() === 6)) continue;

    const open = price;
    const changeRange = open * 0.025;
    const close = open + (rand() - 0.47) * changeRange;
    const wickRange = Math.abs(close - open) * (0.5 + rand() * 1.5);
    const high = Math.max(open, close) + rand() * wickRange;
    const low = Math.min(open, close) - rand() * wickRange;

    candles.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume: Math.floor(500 * K + rand() * 5 * M),
    });
    price = close;
  }
  return candles;
}

function financialsFor(quote: Quote): StockFinancials {
  const rand = seedRandom(symbolSeed(quote.symbol) + 7);
  const revenue = Math.round(quote.marketCap * (0.1 + rand() * 0.4));
  const operatingProfit = Math.round(revenue * (0.08 + rand() * 0.12));
  const netIncome = Math.round(operatingProfit * (0.55 + rand() * 0.25));
  return {
    revenue,
    operatingProfit,
    netIncome,
    per: Math.round((8 + rand() * 25) * 10) / 10,
    pbr: Math.round((0.8 + rand() * 4) * 100) / 100,
    roe: Math.round((4 + rand() * 18) * 10) / 10,
  };
}

export function getStockDetail(symbol: string): StockDetail | undefined {
  const quote = getQuote(symbol);
  if (!quote) return undefined;
  return {
    ...quote,
    high52w: Math.round(quote.price * 1.35),
    low52w: Math.round(quote.price * 0.72),
    description: `${quote.name}은(는) ${quote.sector} 분야의 선도적인 기업으로, 글로벌 시장에서 혁신적인 제품과 서비스를 제공하고 있습니다. 지속적인 R&D 투자와 기술 혁신을 통해 시장 점유율을 확대하고 있습니다.`,
    financials: financialsFor(quote),
  };
}

export function getNews(symbol: string): NewsItem[] {
  const quote = getQuote(symbol);
  if (!quote) return [];
  return [
    { id: `${symbol}-n1`, symbol, title: `${quote.name}, 2분기 실적 시장 예상치 상회`, source: '한국경제', publishedAt: '2026-06-15T13:30:00+09:00' },
    { id: `${symbol}-n2`, symbol, title: `외국인 투자자 ${quote.name} 순매수세 지속`, source: '매일경제', publishedAt: '2026-06-15T11:10:00+09:00' },
    { id: `${symbol}-n3`, symbol, title: `${quote.sector} 업황 개선 전망`, source: '이데일리', publishedAt: '2026-06-14T17:45:00+09:00' },
  ];
}
