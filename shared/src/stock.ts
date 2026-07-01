import { Type, type Static } from '@sinclair/typebox';

/**
 * 종목 카탈로그(마스터) — stock-service 소유.
 * 실시간 시세(Quote, market-service)와 분리된 기준정보/검색 도메인이다.
 */

export const StockMarket = Type.Union([Type.Literal('KOSPI'), Type.Literal('KOSDAQ')]);
export type StockMarket = Static<typeof StockMarket>;

export const ListingStatus = Type.Union([
  Type.Literal('LISTED'),
  Type.Literal('DELISTED'),
  Type.Literal('SUSPENDED'),
]);
export type ListingStatus = Static<typeof ListingStatus>;

export const StockSort = Type.Union([
  Type.Literal('CODE_ASC'),
  Type.Literal('NAME_ASC'),
  Type.Literal('MARKET_CAP_DESC'),
]);
export type StockSort = Static<typeof StockSort>;

/** 목록 항목(기준정보). 시세는 포함하지 않는다 — 필요 시 market API로 별도 조회. */
export const StockSummary = Type.Object({
  code: Type.String({ description: '종목코드 (예: "005930")' }),
  name: Type.String(),
  market: Type.String({ description: 'KOSPI / KOSDAQ' }),
  sector: Type.String(),
  marketCap: Type.Number({ description: '시가총액 (미적재 시 0)' }),
  sharesOutstanding: Type.Number(),
  status: Type.String({ description: 'LISTED / DELISTED / SUSPENDED' }),
});
export type StockSummary = Static<typeof StockSummary>;

export const StockFinancialsInfo = Type.Object({
  revenue: Type.Number(),
  operatingProfit: Type.Number(),
  netIncome: Type.Number(),
  per: Type.Number(),
  pbr: Type.Number(),
  roe: Type.Number(),
  fiscalPeriod: Type.String(),
});
export type StockFinancialsInfo = Static<typeof StockFinancialsInfo>;

/** 상세 — 기준정보 + 재무 + 출처(DB/KIWOOM). */
export const StockCatalogDetail = Type.Composite([
  StockSummary,
  Type.Object({
    financials: Type.Optional(StockFinancialsInfo),
    description: Type.String(),
    source: Type.String({ description: 'DB / KIWOOM' }),
  }),
]);
export type StockCatalogDetail = Static<typeof StockCatalogDetail>;

/** 페이지 응답(페이지번호 + total). */
export const StockPage = Type.Object({
  items: Type.Array(StockSummary),
  totalElements: Type.Number(),
  totalPages: Type.Number(),
  page: Type.Number(),
  size: Type.Number(),
});
export type StockPage = Static<typeof StockPage>;

// ── 요청 스키마 ────────────────────────────────────────────────────
export const StockSearchQuery = Type.Object({
  q: Type.Optional(Type.String({ description: '코드/이름 부분검색' })),
  market: Type.Optional(StockMarket),
  sector: Type.Optional(Type.String()),
  status: Type.Optional(ListingStatus),
  sort: Type.Optional(StockSort),
  page: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  size: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});
export type StockSearchQuery = Static<typeof StockSearchQuery>;

export const StockCodeParams = Type.Object({ code: Type.String() });
export type StockCodeParams = Static<typeof StockCodeParams>;
