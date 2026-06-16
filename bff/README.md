# Candle BFF

Backend-for-Frontend for the Candle mock-investment app. Built with **Fastify + TypeScript**.
Currently serves **mock data**; the market-data layer is abstracted behind a provider
interface so it can be swapped for the Korea Investment (한국투자증권) OpenAPI with no
route/schema changes.

## Quick start

```bash
cp .env.example .env      # adjust if needed
npm install
npm run dev               # http://localhost:4000  (watch mode via tsx)
```

- `npm run dev` — dev server with reload
- `npm run build` — compile to `dist/`
- `npm start` — run the compiled server
- `npm run typecheck` — type-check only

Interactive API docs (auto-generated from route schemas): **http://localhost:4000/docs**

## Architecture

```
src/
├─ server.ts              # entry: build app + listen
├─ app.ts                 # Fastify instance, CORS, Swagger, route registration
├─ config/env.ts          # env loading (PORT, CORS_ORIGINS, DATA_SOURCE, KIS_*)
├─ schemas/               # TypeBox schemas — SINGLE SOURCE OF TRUTH for data shapes
│  ├─ common.ts           #   Exchange, Currency, ErrorResponse
│  ├─ market.ts           #   Quote, Candle, StockDetail, NewsItem, MarketMovers
│  ├─ account.ts          #   Account, Holding, Transaction, PortfolioPoint, SectorAllocation
│  ├─ social.ts           #   RankingEntry, Mission, LearnContent
│  └─ user.ts             #   UserProfile, AuthResponse
├─ data/                  # mock datasets + deterministic generators
├─ providers/             # market-data source abstraction (the swap point)
│  ├─ market.provider.ts  #   MarketProvider interface
│  ├─ mock-market.provider.ts
│  └─ index.ts            #   factory keyed off DATA_SOURCE
└─ routes/                # one file per domain; schemas drive validation + serialization
```

Each schema is defined once with TypeBox and its TS type is derived via `Static<typeof X>`,
so validation, response serialization, OpenAPI docs, and compile-time types never drift.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/signup` | 회원가입 (mock) |
| POST | `/api/auth/login` | 로그인 (mock) |
| GET | `/api/auth/me` | 현재 사용자 |
| GET | `/api/market/stocks` | 종목 목록/검색 (`?q=&exchange=&sector=&limit=`) |
| GET | `/api/market/movers` | 시장 동향 (상승/하락/거래상위) |
| GET | `/api/market/stocks/:symbol` | 종목 상세 (시세 + 재무 + 개요) |
| GET | `/api/market/stocks/:symbol/candles` | 캔들 데이터 (`?interval=1d|1w|1M&limit=`) |
| GET | `/api/market/stocks/:symbol/news` | 종목 뉴스 |
| GET | `/api/account` | 계좌 요약 (대시보드 통계) |
| GET | `/api/account/holdings` | 보유 종목 |
| GET | `/api/account/transactions` | 거래 내역 (`?type=buy|sell&limit=`) |
| GET | `/api/account/portfolio-history` | 자산 추이 (`?days=`) |
| GET | `/api/account/allocation` | 섹터별 자산 구성 |
| POST | `/api/account/orders` | 매수/매도 주문 (모의 체결) |
| GET | `/api/rankings` | 투자 랭킹 |
| GET | `/api/rankings/me` | 내 랭킹 |
| GET | `/api/missions` | 미션/챌린지 (`?category=daily|weekly|special`) |
| GET | `/api/learn` | 학습 콘텐츠 (`?level=&category=`) |
| GET | `/api/learn/:id` | 학습 콘텐츠 상세 |

## Data model notes (frontend migration)

The mock UI in `webapp` used display strings; the BFF establishes the **canonical
numeric model** instead, so it maps onto a real data feed. Notable changes the frontend
will adopt when wiring up to the BFF:

- `Quote.volume` / `Quote.marketCap` are **numbers** (e.g. `12300000`, `426e12`), not
  `"12.3M"` / `"426조"`. Format on the client.
- `Quote` adds `currency`, `prevClose`, `open`, `high`, `low`, `updatedAt`.
- `Transaction`: `total` → `amount`; `date` + `time` → single ISO `executedAt`; adds
  `fee` and `status`.
- `Holding` adds `costBasis`.
- `RankingUser.change` → `RankingEntry.dayChangePercent`; adds `userId`.
- `SectorAllocation` drops `color` (a frontend concern).

## Switching to the real OpenAPI (한국투자증권)

1. Set `KIS_APP_KEY` / `KIS_APP_SECRET` (and `KIS_BASE_URL`) in `.env`.
2. Add `src/providers/kis-market.provider.ts` implementing the `MarketProvider` interface
   (`listStocks`, `getStock`, `getCandles`, `getNews`, `getMovers`).
3. Wire it into the `getMarketProvider()` factory under the `case 'kis'` branch.
4. Set `DATA_SOURCE=kis`.

No route, schema, or frontend changes are required — the response contracts stay identical.

## CORS

Allowed origins come from `CORS_ORIGINS`. Defaults include the Capacitor origins
(`capacitor://localhost`, `https://localhost`) and the Next.js dev server
(`http://localhost:3000`).
