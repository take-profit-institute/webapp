# 실시간 시세 아키텍처

## 개요

모의투자 플랫폼의 실시간 주식 시세는 세 가지 레이어로 구성된다.

1. **시세 수집 레이어** — 외부 API(키움 등)에서 WebSocket으로 raw tick 수신
2. **이벤트 배포 레이어** — Redis Pub/Sub으로 내부 서비스 간 tick 전파
3. **클라이언트 전달 레이어** — BFF가 프론트엔드로 WebSocket relay

```
구독(demand): 브라우저가 보는 종목만 market-service 가 키움에 등록한다 (모델 B)

  브라우저 WS subscribe(symbol)
      ↓
  [BFF MarketDemand]  ── 심볼 refcount 0→1 ──▶  StreamQuotes(symbol) gRPC ──▶ [market-service]
      ▲                  (1→0 → 스트림 취소)                                     (viewer 수요 → 키움 REG)

데이터(tick): 등록된 종목의 tick 이 Redis 를 거쳐 브라우저로

  [키움 WS] ──▶ [market-service] ─ Redis: stock-price ─▶ [BFF MarketBridge]
                       │                                        │ WsQuoteUpdate
                       │                                        ▼
                       │                                    bff:quotes ─▶ [BFF MarketStream] ─ WS ─▶ [Browser]
                       └─ Redis: market:quotes ─▶ [wishlist-service] (±5% 알림, 백엔드 계약)
```

> `StreamQuotes` gRPC 스트림은 **뷰어 데몬드 시그널**이고, 실제 tick 데이터는 Redis 경로로 흐른다.
> 자세한 건 아래 "실시간 구독 데몬드 (모델 B)" 참고.

---

## 왜 BFF를 경유하는가

프론트엔드에서 외부 시세 API에 직접 WebSocket을 연결하지 않는 이유:

| 이유 | 설명 |
|------|------|
| **CORS / 보안** | 증권사 API는 브라우저 직접 호출 차단, API Key 노출 방지 |
| **Capacitor 환경** | iOS/Android 네이티브 앱에서 직접 연결 시 인증서·프록시 이슈 |
| **토큰 관리** | 키움 WebSocket 접속에 필요한 `approval_key`는 서버에서 발급·갱신해야 함 |
| **연결 비용** | 클라이언트마다 외부 API 연결 대신, BFF 하나가 연결을 유지하고 브로드캐스트 |

---

## Market Event Service (별도 마이크로서비스)

BFF와 분리된 별도 서비스로 항상 실행 상태를 유지해야 한다.

**분리 이유:**
- BFF는 유저 요청에 반응하는 서버 — 배포·재시작 시 WebSocket 끊김
- 가격 감시 및 알람 이벤트는 유저 연결 여부와 무관하게 지속 실행
- 알람 발행, tick 영속, 시세 수집 로직을 request handling 코드와 분리

**역할:** (실제 구현은 백엔드 `market-service`. 상세는 백엔드 `docs/REALTIME_QUOTE_PIPELINE.md`)
- 키움 WebSocket 연결 유지 (또는 mock publisher) — **데몬드 기반**으로 필요한 종목만 등록
- Redis `stock-price` 발행(→ BFF 브리지) 및 `market:quotes` 발행(→ wishlist-service ±5% 알림)
- BFF 의 `StreamQuotes` gRPC 데몬드를 받아 키움 실시간 구독 집합 재조정
- (tick 영속/집계는 후속 과제)

---

## Redis Pub/Sub 채널 설계

| 채널 | 발행자 | 구독자 | 내용 |
|------|--------|--------|------|
| `stock-price` | market-service | BFF (MarketBridgeService) | market-service raw 시세(`StockPriceMessage`) |
| `bff:quotes` | BFF (MarketBridgeService / mock) | BFF (MarketStreamService, TickStoreService) | 프론트 WS 계약(`WsQuoteUpdate`) |
| `market:quotes` | market-service | wishlist-service | ±5% 알림용 시세(`QuoteTick`) — **백엔드 계약, BFF 무관** |

- market-service 는 raw 시세를 `stock-price` 에 발행한다. **MarketBridgeService** 가 이를
  `WsQuoteUpdate` 로 변환해 BFF 내부 채널 `bff:quotes` 로 재발행한다.
- **MarketStreamService**(WS 브로드캐스트)와 **TickStoreService**(초기 스냅샷 버퍼)는 `bff:quotes` 를 구독한다.
- mock 모드에서는 mock publisher 가 `bff:quotes` 를 직접 채운다.
- `market:quotes` 는 market-service→wishlist-service 의 백엔드 계약 채널(스키마가 `QuoteTick` 로 다름)이라
  BFF 는 쓰지 않는다. **같은 Redis 를 공유해도 채널명이 분리돼 충돌하지 않는다**(과거 BFF 가 이 이름을
  내부 팬아웃에 쓰다 백엔드 wishlist 계약과 겹쳐, `bff:quotes` 로 분리함).

채널명은 `services/market-channels.ts` 한곳에서 관리한다. Redis가 없는 로컬 개발 환경에서는
`REDIS_URL` 미설정 시 in-process `EventEmitter`로 자동 fallback된다.

---

## WebSocket 메시지 스키마

TypeBox로 정의되며 `@candle/shared` 패키지를 통해 BFF와 프론트엔드가 공유한다.

### 서버 → 클라이언트

```typescript
// 실시간 시세 업데이트
WsQuoteUpdate = {
  type: 'quote_update',
  data: {
    symbol: string,
    price: number,
    change: number,
    changePercent: number,
    volume: number,
    timestamp: string  // ISO 8601
  }
}

// 가격 알람 발생 (stub — 향후 구현)
WsAlertFired = {
  type: 'alert_fired',
  data: {
    alertId: string,
    symbol: string,
    condition: string,
    triggeredAt: string
  }
}

// 연결 확인
WsConnected = {
  type: 'connected',
  data: { sessionId: string }
}
```

### 클라이언트 → 서버

```typescript
WsSubscribe   = { type: 'subscribe',   symbols: string[] }
WsUnsubscribe = { type: 'unsubscribe', symbols: string[] }
```

---

## BFF WebSocket 엔드포인트

```
GET /ws  (WebSocket upgrade)
```

클라이언트는 연결 직후 `subscribe` 메시지로 관심 종목을 등록한다. BFF는 해당 종목의 `quote_update` 메시지만 필터링해서 전달한다.

```
클라이언트 연결
    → { type: 'connected', data: { sessionId } } 수신
    → { type: 'subscribe', symbols: ['005930', 'AAPL'] } 전송
    → 해당 종목 tick만 수신
```

---

## 실시간 구독 데몬드 (모델 B 멀티플렉스)

브라우저가 어떤 종목을 실제로 "보고 있을 때만" market-service 가 그 종목을 키움에 실시간 등록하도록,
BFF 가 수요를 집계해 market-service gRPC `StreamQuotes` 스트림을 여닫는다.

원칙: **market-service 는 심볼당 upstream 스트림을 최대 1개만 받는다.** 같은 종목을 N 명이 봐도
market 으로 가는 스트림은 1개다. "여러 명이 보면 마지막 1명 나갈 때까지 구독 유지"라는 브라우저 단위
판단은 market 이 아니라 **BFF 가 소유**한다(= 모델 B).

### MarketDemandService (`services/market-demand.service.ts`)

- 심볼별 **브라우저 뷰어 refcount** 를 유지한다(모든 WS 소켓 합산).
- 심볼 뷰어 **0→1**: `StreamQuotes({ symbol })` upstream 을 1개 연다.
- 심볼 뷰어 **1→0**: 5s grace 후 그 스트림을 취소한다(상세 새로고침 플래핑 방지).
- 스트림이 끊기면(서버 재시작 등) 수요가 남아있는 동안 재연결한다.
- `DATA_SOURCE=grpc` 에서만 동작. mock 모드는 no-op(자체 mock 스트림이 데이터 공급).

### 배선

```
브라우저 WS subscribe / unsubscribe / (소켓 close)
   │  MarketStreamService 가 소켓별 심볼 델타 계산
   ▼
MarketDemandService.acquire / release(symbols)
   │  심볼 refcount 0↔1 전이에서만
   ▼
StreamQuotes(symbol) upstream open / close  ──▶  market-service
   ▼
market-service SubscriptionManager: viewer 수요 획득/해제 → (wishlist 와 합집합) → 키움 REG/REMOVE
```

### gRPC 스트림 = 데몬드 시그널, 데이터는 Redis 경로

`StreamQuotes` 스트림은 **뷰어가 보고 있다는 신호**로만 쓴다. market-service 가 이 스트림을 보고 키움
실시간을 등록하면, 그 tick 은 기존 Redis 경로(`stock-price` → MarketBridge → `bff:quotes` →
브로드캐스트)로 브라우저에 도달한다. 그래서 MarketDemandService 는 스트림을 열어두기만 하고
`LiveQuote` payload 는 소비 후 버린다(데이터 이중 전달 방지). 데이터 경로를 gRPC 로 일원화하는 것은
후속 과제.

> 이 계약의 **백엔드 측 명세**: 백엔드 레포 `docs/BFF_GRPC_CONTRACT.md §7`.
> 파이프라인 전체(구독 재조정·grp_no 샤딩·wishlist 이벤트): `docs/REALTIME_QUOTE_PIPELINE.md`.

---

## 프론트엔드 실시간 연동

### 데이터 흐름

```
useMarketSocket(symbols)          // WS 연결·구독
    ↓ quote_update 수신
useMarketStore.liveQuotes         // Zustand 저장소
    ↓ React reactivity
컴포넌트 리렌더 (가격 표시 업데이트)
```

### 종목 상세 페이지 (`/market/:symbol`)

- 초기 가격/등락: REST `GET /api/market/stocks/:symbol` 응답 사용
- WS 데이터 수신 후: `liveQuotes[symbol]` 값으로 override
- WS 데이터 없으면 REST 응답 그대로 표시 (fallback)
- 재연결 전략: exponential backoff (1s → 2s → 4s ... 최대 30s)

---

## 당일 인트라데이 차트

### 문제

WebSocket 단독으로는 불충분하다 — 연결 이전에 발생한 tick은 수신 불가.

### 해결: REST(스냅샷) + WS(실시간) 병합

```
페이지 로드
  1. GET /api/market/stocks/:symbol/intraday
     → 오늘 09:00부터 현재까지 누적 tick 반환 (초기 차트 렌더)

  2. WS quote_update 수신 시
     → intradayTicks 배열에 append → 차트 리렌더
```

### 차트 구성

- 라이브러리: `recharts` (LineChart)
- X축: 시간 (HH:mm)
- Y축: 가격
- 기준선: 첫 tick 가격 (점선)
- 선 색상: 첫 tick 대비 현재가 기준 상승(green) / 하락(red)
- "기간별" 탭 전환 시 기존 CandleChart(OHLCV) 표시

---

## Tick 영속 저장소: TimescaleDB

### 왜 TimescaleDB인가

- 시계열 데이터에 최적화된 PostgreSQL 확장
- 시간 기반 자동 파티셔닝 (hypertable)
- **Continuous Aggregate** — raw tick → 1분봉 자동 집계 및 유지
- 일반 RDB 대비 시계열 쿼리 성능 우수

### 스키마

```sql
-- Raw tick 저장
CREATE TABLE ticks (
  time        TIMESTAMPTZ NOT NULL,
  symbol      TEXT NOT NULL,
  price       NUMERIC NOT NULL,
  volume      BIGINT,
  change_pct  NUMERIC
);
SELECT create_hypertable('ticks', 'time');
CREATE INDEX ON ticks (symbol, time DESC);

-- 1분봉 자동 집계 (continuous aggregate)
CREATE MATERIALIZED VIEW ticks_1min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  symbol,
  first(price, time)  AS open,
  max(price)          AS high,
  min(price)          AS low,
  last(price, time)   AS close,
  sum(volume)         AS volume
FROM ticks
GROUP BY bucket, symbol;
```

BFF의 `/intraday` 엔드포인트는 raw tick 대신 `ticks_1min`을 쿼리한다. 1초 tick이 들어와도 continuous aggregate가 자동으로 1분봉을 유지해줌.

---

## Cold Start 전략

앱 최초 실행 또는 장 시작 시 DB에 당일 데이터가 없는 상황에 대한 처리.

### Real API 모드 (키움)

키움 REST API의 당일 분봉 조회 엔드포인트(KA10080)를 통해 backfill:

```
BFF / Market Event Service 시작
  → 키움 API: 오늘 09:00부터 현재까지 분봉 데이터 조회
  → TimescaleDB bulk INSERT
  → 이후 WS tick으로 실시간 갱신
```

### Mock 모드

실제 데이터가 없으므로 시작 시 synthetic random walk 생성:

```
BFF 시작 (DATA_SOURCE=mock)
  → 각 종목 기준가에서 오늘 09:00부터 현재시각까지
    random walk로 분봉 생성 → DB INSERT
  → 이후 mock publisher tick 이어 붙임
```

### 시나리오별 정리

| 상황 | 처리 |
|------|------|
| 최초 실행 (real) | 키움 당일 분봉 backfill |
| 최초 실행 (mock) | synthetic walk 생성 후 DB INSERT |
| 장 중 재시작 | DB에 이미 당일 데이터 존재 → 바로 서빙 |
| 장 마감 후 | 당일 데이터 보존, 다음 날 09:00 리셋 |
| 신규 종목 추가 | 첫 tick 수신 전까지 "수집 중" 표시 |

---

## 환경변수 요약

| 변수 | 위치 | 설명 |
|------|------|------|
| `REDIS_URL` | BFF `.env` | Redis 연결 주소. 미설정 시 in-process EventEmitter fallback |
| `DATA_SOURCE` | BFF `.env` | `grpc` (기본값), `mock`, 또는 `kis` |
| `GRPC_MARKET_ADDR` | BFF `.env` | market-service gRPC 주소 (기본: `localhost:50063`) — StreamQuotes 데몬드·인트라데이 스냅샷 |
| `NEXT_PUBLIC_WS_BASE_URL` | webapp `.env.local` | WebSocket 기본 주소 (기본: `ws://localhost:4000`) |

---

## 현재 구현 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Redis Pub/Sub (BFF) | ✅ 완료 | EventEmitter fallback 포함 |
| BFF WebSocket `/ws` | ✅ 완료 | 종목별 구독 필터링 |
| Mock Publisher | ✅ 완료 | 1초 tick, 8종목 |
| `useMarketSocket` 훅 | ✅ 완료 | 자동 재연결 포함 |
| `useMarketStore` (Zustand) | ✅ 완료 | 실시간 가격 상태 |
| 종목 상세 페이지 실시간 연동 | ✅ 완료 | WS → REST fallback |
| In-memory TickStore | ✅ 완료 | 500 tick 캡 |
| `/intraday` REST API | ✅ 완료 | |
| IntradayChart (recharts) | ✅ 완료 | REST 스냅샷 + WS append |
| 실시간 구독 데몬드 (모델 B) | ✅ 완료 | MarketDemandService — 심볼별 refcount + StreamQuotes open/close |
| market-service gRPC 연동 | ✅ 완료 | StreamQuotes(데몬드), GetIntradayTicks(스냅샷). `DATA_SOURCE=grpc` |
| 채널 분리 (`bff:quotes`) | ✅ 완료 | 백엔드 `market:quotes`(wishlist) 계약과 충돌 방지 |
| 키움 WebSocket 연동 | ✅ 완료 | market-service 가 소유(BFF 는 gRPC 데몬드만). 키움 키 필요 |
| TimescaleDB 연동 | ⬜ 미구현 | tick 영속(현재 in-memory) |
| Cold start backfill | ⬜ 미구현 | Real API 연동 시 |
| WsAlertFired 라우팅 | ⬜ 미구현 | 알람 서비스 구현 시 |
| gRPC 데이터 경로 일원화 | ⬜ 후속 | LiveQuote 를 직접 팬아웃(현재 Redis 브리지 병행) |
