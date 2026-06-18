# 실시간 시세 아키텍처

## 개요

모의투자 플랫폼의 실시간 주식 시세는 세 가지 레이어로 구성된다.

1. **시세 수집 레이어** — 외부 API(키움 등)에서 WebSocket으로 raw tick 수신
2. **이벤트 배포 레이어** — Redis Pub/Sub으로 내부 서비스 간 tick 전파
3. **클라이언트 전달 레이어** — BFF가 프론트엔드로 WebSocket relay

```
[키움 OpenAPI WS / Mock Publisher]
           ↓
[Market Event Service]
    ├── Redis PUBLISH market:quotes
    │         ↓
    │   [Redis Pub/Sub]
    │         ↓
    │     [BFF]  ─── WebSocket ──→ [Browser / App]
    │
    └── TimescaleDB INSERT (tick 영속)
              ↓ continuous aggregate
         ticks_1min (자동 유지)
```

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

**역할:**
- 키움 WebSocket 연결 유지 (또는 mock publisher)
- 유저별 알람 조건 감시 → 조건 충족 시 FCM 푸시 발송
- Redis `market:quotes` 채널에 tick publish
- TimescaleDB에 tick 저장

---

## Redis Pub/Sub 채널 설계

| 채널 | 발행자 | 구독자 | 내용 |
|------|--------|--------|------|
| `market:quotes` | Market Event Service | BFF (MarketStreamService, TickStoreService) | `WsQuoteUpdate` 메시지 |

BFF는 Redis 구독을 두 곳에서 동시에 사용한다:
- **MarketStreamService** — 연결된 WS 클라이언트에 브로드캐스트
- **TickStoreService** — tick을 메모리(개발) 또는 TimescaleDB(운영)에 저장

Redis가 없는 로컬 개발 환경에서는 `REDIS_URL` 미설정 시 in-process `EventEmitter`로 자동 fallback된다.

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
| `DATA_SOURCE` | BFF `.env` | `mock` (기본값) 또는 `kis` |
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
| TimescaleDB 연동 | ⬜ 미구현 | Market Event Service 구현 시 |
| Cold start backfill | ⬜ 미구현 | Real API 연동 시 |
| WsAlertFired 라우팅 | ⬜ 미구현 | 알람 서비스 구현 시 |
| 키움 WebSocket 연동 | ⬜ 미구현 | `DATA_SOURCE=kis` 전환 시 |
