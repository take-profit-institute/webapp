import { Type, type Static } from '@sinclair/typebox';
import { Currency, Exchange } from './common';

/**
 * A real-time(ish) price quote for a single instrument.
 *
 * All monetary/volume fields are numeric (not pre-formatted strings) so the BFF
 * stays display-agnostic and maps cleanly onto a real market-data provider later.
 * The frontend is responsible for formatting (e.g. 71400 -> "71,400", 426e12 -> "426조").
 */
export const Quote = Type.Object(
  {
    symbol: Type.String({ description: 'Ticker / 종목코드 (e.g. "005930", "AAPL")' }),
    name: Type.String(),
    exchange: Exchange,
    currency: Currency,
    sector: Type.String(),
    price: Type.Number({ description: 'Last traded price' }),
    change: Type.Number({ description: 'Absolute change vs previous close' }),
    changePercent: Type.Number(),
    prevClose: Type.Number(),
    open: Type.Number(),
    high: Type.Number({ description: 'Intraday high' }),
    low: Type.Number({ description: 'Intraday low' }),
    volume: Type.Number({ description: 'Shares traded today' }),
    marketCap: Type.Number({ description: 'Market capitalization in the listing currency' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
);
export type Quote = Static<typeof Quote>;

/** OHLCV candle. `date` is YYYY-MM-DD for daily; ISO datetime for intraday intervals. */
export const Candle = Type.Object(
  {
    date: Type.String(),
    open: Type.Number(),
    high: Type.Number(),
    low: Type.Number(),
    close: Type.Number(),
    volume: Type.Number(),
  },
);
export type Candle = Static<typeof Candle>;

export const CandleInterval = Type.Union(
  [Type.Literal('1d'), Type.Literal('1w'), Type.Literal('1M')],
);
export type CandleInterval = Static<typeof CandleInterval>;

export const StockFinancials = Type.Object(
  {
    revenue: Type.Number({ description: '매출액' }),
    operatingProfit: Type.Number({ description: '영업이익' }),
    netIncome: Type.Number({ description: '순이익' }),
    per: Type.Number(),
    pbr: Type.Number(),
    roe: Type.Number({ description: 'Return on equity, percent' }),
  },
);
export type StockFinancials = Static<typeof StockFinancials>;

/** Full detail for the stock page — quote plus fundamentals and descriptive data. */
export const StockDetail = Type.Composite(
  [
    Quote,
    Type.Object({
      high52w: Type.Number(),
      low52w: Type.Number(),
      afterHoursClose: Type.Optional(Type.Number({ description: '시간외종가/최근 확정 종가. 없으면 price 사용' })),
      description: Type.String(),
      financials: StockFinancials,
    }),
  ],
);
export type StockDetail = Static<typeof StockDetail>;

export const NewsItem = Type.Object(
  {
    id: Type.String(),
    symbol: Type.Optional(Type.String()),
    title: Type.String(),
    source: Type.String(),
    publishedAt: Type.String({ format: 'date-time' }),
    url: Type.Optional(Type.String()),
  },
);
export type NewsItem = Static<typeof NewsItem>;

/** Dashboard "시장 동향" — top gainers / losers / most active. */
export const MarketMovers = Type.Object(
  {
    gainers: Type.Array(Quote),
    losers: Type.Array(Quote),
    mostActive: Type.Array(Quote),
  },
);
export type MarketMovers = Static<typeof MarketMovers>;

// ── Trending rankings (마켓 랜딩 탭) ────────────────────────────────
// 트렌딩 랭킹의 유일 소유자는 market-service proto 의 RankingType enum. BFF·프론트는 라벨/렌더만
// 하고 자기 문자열을 새로 정의하지 않는다. 6종은 실제 캐시 키(rising/falling/...)와 1:1.
export const RankingType = Type.Union([
  Type.Literal('RISING'),
  Type.Literal('FALLING'),
  Type.Literal('VOLUME_SPIKE'),
  Type.Literal('POPULAR'),
  Type.Literal('RATE_UP'),
  Type.Literal('RATE_DOWN'),
]);
export type RankingType = Static<typeof RankingType>;

export const RankingItem = Type.Object({
  rank: Type.Integer(),
  symbol: Type.String(),
  name: Type.String(),
  price: Type.Number({ description: '현재가(원)' }),
  change: Type.Number({ description: '전일 대비' }),
  changePercent: Type.Number({ description: '등락률 %' }),
  volume: Type.Number({ description: '거래량' }),
});
export type RankingItem = Static<typeof RankingItem>;

export const Ranking = Type.Object({
  type: RankingType,
  asOf: Type.String({ format: 'date-time', description: '캐시 기준 시각(신선도)' }),
  items: Type.Array(RankingItem),
});
export type Ranking = Static<typeof Ranking>;

export const RankingQuery = Type.Object({
  type: RankingType,
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
});
export type RankingQuery = Static<typeof RankingQuery>;

// ── Request schemas ────────────────────────────────────────────────
export const StockListQuery = Type.Object({
  q: Type.Optional(Type.String({ description: 'Search by name or symbol' })),
  exchange: Type.Optional(Exchange),
  sector: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
});
export type StockListQuery = Static<typeof StockListQuery>;

export const SymbolParams = Type.Object({ symbol: Type.String() });
export type SymbolParams = Static<typeof SymbolParams>;

export const CandleQuery = Type.Object({
  interval: Type.Optional(CandleInterval),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 365 })),
});
export type CandleQuery = Static<typeof CandleQuery>;

// ── Intraday (real-time tick history) ─────────────────────────────

export const IntradayTick = Type.Object({
  price: Type.Number(),
  timestamp: Type.String({ format: 'date-time' }),
});
export type IntradayTick = Static<typeof IntradayTick>;

export const IntradayHistory = Type.Object({
  symbol: Type.String(),
  ticks: Type.Array(IntradayTick),
});
export type IntradayHistory = Static<typeof IntradayHistory>;

// ── Market status ──────────────────────────────────────────────────

/** 장 운영 상태 (ORD-012). 마감 시 즉시(시장가) 주문은 예약 주문으로 유도된다. */
export const MarketSession = Type.Union([Type.Literal('regular'), Type.Literal('closed')]);
export type MarketSession = Static<typeof MarketSession>;

export const MarketStatus = Type.Object(
  {
    open: Type.Boolean(),
    session: MarketSession,
    asOf: Type.String({ format: 'date-time' }),
    message: Type.Optional(Type.String()),
  },
);
export type MarketStatus = Static<typeof MarketStatus>;
