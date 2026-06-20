# SQL 컨벤션 — Candle 플랫폼 (PostgreSQL)

> 기준 DBMS: **PostgreSQL 16+**
> TimescaleDB 확장: 시세 틱·캔들 저장 테이블 한정 적용.

---

## 목차

1. [일반 원칙](#1-일반-원칙)
2. [네이밍 규칙](#2-네이밍-규칙)
3. [데이터 타입](#3-데이터-타입)
4. [제약조건 이름](#4-제약조건-이름)
5. [표준 컬럼](#5-표준-컬럼)
6. [인덱스](#6-인덱스)
7. [ENUM 타입](#7-enum-타입)
8. [금액·수량 처리](#8-금액수량-처리)
9. [아웃박스 테이블](#9-아웃박스-테이블)
10. [멱등성 테이블](#10-멱등성-테이블)
11. [서비스별 테이블 설계](#11-서비스별-테이블-설계)
12. [마이그레이션 규칙](#12-마이그레이션-규칙)
13. [금지 사항](#13-금지-사항)

---

## 1. 일반 원칙

- 모든 DDL은 버전 관리(마이그레이션 파일)로 관리하며 직접 수정하지 않는다.
- 스키마는 서비스 경계와 1:1로 대응한다 (`auth`, `user_svc`, `market`, `account`, `order_svc`, `reservation`, `holding`, `portfolio`, `ranking`, `notification`, `mission`, `learning`, `reward`).
- 각 서비스는 **자신의 스키마만** 소유하고 타 서비스 테이블에 외래키를 걸지 않는다.
- 공유 도메인 값(userId 등)은 `UUID` 타입으로 복사 저장한다(FK 없이).
- 금액은 부동소수점을 사용하지 않는다 (→ [8장](#8-금액수량-처리)).
- 모든 타임스탬프는 `TIMESTAMPTZ`를 사용한다 (`TIMESTAMP` 금지).

---

## 2. 네이밍 규칙

### 2.1 공통 규칙

| 대상 | 형식 | 예시 |
|---|---|---|
| 스키마 | `snake_case` | `order_svc`, `user_svc` |
| 테이블 | `snake_case`, 복수형 | `orders`, `holdings`, `refresh_tokens` |
| 컬럼 | `snake_case`, 단수형 | `user_id`, `created_at`, `order_kind` |
| 뷰 | `snake_case`, `_view` 접미사 | `active_orders_view` |
| 함수 | `snake_case`, 동사형 | `set_updated_at()`, `compute_unrealized_pnl()` |
| 트리거 | `trg_{테이블}_{시점}_{동작}` | `trg_orders_before_update` |
| 시퀀스 | `seq_{테이블}_{컬럼}` | `seq_ticks_id` |
| ENUM 타입 | `{도메인}_{역할}_type` | `order_status_type`, `user_role_type` |
| 파티션 테이블 | `{부모테이블}_{기준값}` | `ticks_2026_06` |

### 2.2 테이블 약어

서비스 스키마를 명시하면 테이블 이름에 서비스 접두사를 붙이지 않는다.

```sql
-- 올바름
CREATE TABLE order_svc.orders ( ... );
CREATE TABLE order_svc.order_events ( ... );

-- 잘못됨 (중복)
CREATE TABLE order_svc.order_orders ( ... );
```

### 2.3 Boolean 컬럼

`is_` 또는 `has_` 접두사를 붙인다.

```sql
is_active       BOOLEAN NOT NULL DEFAULT true,
is_deleted      BOOLEAN NOT NULL DEFAULT false,
has_reward      BOOLEAN NOT NULL DEFAULT false,
```

### 2.4 날짜/시각 컬럼

| 의미 | 컬럼명 패턴 | 타입 |
|---|---|---|
| 레코드 생성 시각 | `created_at` | `TIMESTAMPTZ` |
| 레코드 갱신 시각 | `updated_at` | `TIMESTAMPTZ` |
| 소프트 삭제 시각 | `deleted_at` | `TIMESTAMPTZ NULL` |
| 특정 이벤트 발생 시각 | `{이벤트}_at` (예: `executed_at`, `claimed_at`) | `TIMESTAMPTZ` |
| 특정 이벤트 예정 날짜 | `{이벤트}_date` (예: `scheduled_date`) | `DATE` |
| 만료 시각 | `expires_at` | `TIMESTAMPTZ` |
| 처리 완료 시각 | `processed_at` | `TIMESTAMPTZ NULL` |

```sql
-- 올바름
executed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
scheduled_date  DATE        NOT NULL,
expires_at      TIMESTAMPTZ,

-- 잘못됨
execute_time    TIMESTAMP,   -- 시간대 없음
expiry          VARCHAR,     -- 타입 불일치
```

### 2.5 외부 서비스 참조 ID

타 서비스의 ID를 저장하는 컬럼은 `{서비스_단위}_{id}` 형식을 사용한다.

```sql
user_id         UUID    NOT NULL,   -- UserService 소유
account_id      UUID    NOT NULL,   -- AccountService 소유
order_id        UUID,               -- OrderService 소유 (nullable)
```

---

## 3. 데이터 타입

### 3.1 식별자

| 상황 | 타입 | 기본값 | 근거 |
|---|---|---|---|
| 일반 도메인 엔터티 PK | `UUID` | `gen_random_uuid()` | 서비스 간 분리, 외부 노출 안전 |
| 고빈도 이벤트 테이블 (틱, 아웃박스) | `BIGINT GENERATED ALWAYS AS IDENTITY` | — | 정렬성, 저장 효율 |
| 외부 계좌번호·종목코드 등 비즈니스 키 | `TEXT` | — | 자연키, 가변 길이 허용 |

```sql
-- 도메인 엔터티
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

-- 고빈도 이벤트
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

-- 종목코드 (6자리 숫자 또는 AAPL 같은 알파벳)
symbol VARCHAR(20) NOT NULL,
```

### 3.2 문자열

| 상황 | 타입 | 이유 |
|---|---|---|
| 일반 텍스트(이름, 제목, 메시지) | `TEXT` | 길이 제한 불필요시 TEXT 우선 |
| 코드값(심볼, ISO 코드 등) | `VARCHAR(n)` | 비즈니스 상 최대 길이 확정 시 |
| 비밀번호 해시 | `TEXT` | bcrypt 해시 길이 고정이지만 변경 여지 존재 |

```sql
-- 올바름
username    TEXT        NOT NULL,
symbol      VARCHAR(20) NOT NULL,
email       TEXT        NOT NULL,

-- 잘못됨 (임의 길이 제한)
username    VARCHAR(50),   -- 왜 50?
title       VARCHAR(255),  -- PostgreSQL에서 TEXT와 성능 차이 없음
```

### 3.3 타임스탬프

```sql
-- 항상 TIMESTAMPTZ
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

-- 날짜만 필요한 경우
scheduled_date DATE NOT NULL,

-- 잘못됨
created_at  TIMESTAMP,         -- 시간대 없음
created_at  BIGINT,            -- epoch ms 금지 (인덱스·쿼리 불편)
```

### 3.4 열거값 (Enum 상태)

→ [7장](#7-enum-타입) 참고.

### 3.5 JSON

| 상황 | 타입 | 이유 |
|---|---|---|
| 아웃박스 페이로드, 알림 메타, 설정 | `JSONB` | 인덱싱 가능, 압축 저장 |
| 로그·감사 스냅샷 (쓰기만 하는 append) | `JSON` | 원본 문자열 보존 |
| 구조가 고정된 복합 필드 | 정규화 컬럼 사용 | JSON 남용 금지 |

```sql
meta        JSONB,
payload     JSONB NOT NULL,
```

### 3.6 금액/수량

→ [8장](#8-금액수량-처리) 별도 기술.

---

## 4. 제약조건 이름

### 4.1 패턴

| 제약 종류 | 패턴 | 예시 |
|---|---|---|
| PK | `pk_{테이블}` | `pk_orders` |
| UK (단일) | `uq_{테이블}_{컬럼}` | `uq_users_email` |
| UK (복합) | `uq_{테이블}_{컬럼1}_{컬럼2}` | `uq_holdings_user_id_symbol` |
| FK | `fk_{테이블}_{참조테이블}` | `fk_orders_accounts` |
| FK (동일 테이블에 여러 개) | `fk_{테이블}_{참조테이블}_{컬럼}` | `fk_orders_orders_parent_order_id` |
| CHECK | `ck_{테이블}_{설명}` | `ck_orders_quantity_positive`, `ck_orders_status` |
| NOT NULL | DDL에서 인라인 선언, 별도 이름 불필요 | — |

### 4.2 DDL 예시

```sql
CREATE TABLE order_svc.orders (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    account_id      UUID        NOT NULL,
    symbol          VARCHAR(20) NOT NULL,
    type            order_type  NOT NULL,
    order_kind      order_kind_type NOT NULL,
    quantity        BIGINT      NOT NULL,
    price_krw       BIGINT,
    amount_krw      BIGINT      NOT NULL,
    fee_krw         BIGINT      NOT NULL DEFAULT 0,
    status          order_status_type NOT NULL DEFAULT 'pending',
    parent_order_id UUID,
    idempotency_key TEXT        NOT NULL,
    executed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_orders           PRIMARY KEY (id),  -- 또는 인라인 선언과 동일
    CONSTRAINT uq_orders_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_orders_orders_parent
        FOREIGN KEY (parent_order_id) REFERENCES order_svc.orders(id),
    CONSTRAINT ck_orders_quantity_positive
        CHECK (quantity > 0),
    CONSTRAINT ck_orders_amount_positive
        CHECK (amount_krw > 0),
    CONSTRAINT ck_orders_fee_nonneg
        CHECK (fee_krw >= 0),
    CONSTRAINT ck_orders_limit_price_required
        CHECK (order_kind != 'limit' OR price_krw IS NOT NULL)
);
```

---

## 5. 표준 컬럼

모든 테이블에 필수로 포함하는 컬럼.

### 5.1 필수 컬럼

```sql
id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
```

`updated_at`은 항상 트리거로 자동 갱신한다.

```sql
-- 공통 트리거 함수 (각 스키마에 1개씩 생성)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 테이블마다 트리거 등록
CREATE TRIGGER trg_orders_before_update
    BEFORE UPDATE ON order_svc.orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 5.2 소프트 삭제 컬럼 (필요 시)

물리 삭제 대신 논리 삭제를 사용하는 테이블에 추가.

```sql
deleted_at  TIMESTAMPTZ,   -- NULL = 정상, NOT NULL = 삭제됨
```

소프트 삭제 테이블은 반드시 부분 인덱스를 함께 생성한다.

```sql
CREATE INDEX idx_orders_active ON order_svc.orders (user_id, created_at DESC)
    WHERE deleted_at IS NULL;
```

### 5.3 낙관적 잠금 컬럼 (동시성이 중요한 테이블)

```sql
version     BIGINT NOT NULL DEFAULT 0,
```

UPDATE 시 `WHERE version = $prev_version AND id = $id` 패턴으로 사용.

### 5.4 컬럼 순서 권장

```
1. id (PK)
2. 도메인 외부키 컬럼들 (user_id, account_id, ...)
3. 비즈니스 키 컬럼 (symbol, email, ...)
4. 상태/타입 컬럼 (status, type, ...)
5. 주요 데이터 컬럼
6. 선택적/보조 컬럼
7. 메타데이터 (meta JSONB, ...)
8. 감사 컬럼 (version, created_at, updated_at, deleted_at)
```

---

## 6. 인덱스

### 6.1 이름 패턴

| 종류 | 패턴 | 예시 |
|---|---|---|
| 일반 | `idx_{테이블}_{컬럼(s)}` | `idx_orders_user_id` |
| 복합 | `idx_{테이블}_{컬럼1}_{컬럼2}` | `idx_orders_user_id_status` |
| 부분 | `idx_{테이블}_{컬럼}_{설명}` | `idx_orders_user_id_pending` |
| 함수 | `idx_{테이블}_{컬럼}_{함수}` | `idx_users_email_lower` |
| JSONB GIN | `idx_{테이블}_{컬럼}_gin` | `idx_outbox_payload_gin` |

### 6.2 필수 인덱스

```sql
-- 외부 서비스 ID 참조 컬럼 (FK 대체)
CREATE INDEX idx_orders_user_id    ON order_svc.orders (user_id);
CREATE INDEX idx_orders_account_id ON order_svc.orders (account_id);

-- 상태 필터링이 잦은 테이블
CREATE INDEX idx_orders_user_id_status
    ON order_svc.orders (user_id, status)
    WHERE status IN ('pending', 'filled');

-- 페이지네이션 (최신순)
CREATE INDEX idx_orders_user_id_created
    ON order_svc.orders (user_id, created_at DESC);

-- 아웃박스 미발행 처리
CREATE INDEX idx_outbox_published ON {schema}.outbox_events (published_at)
    WHERE published_at IS NULL;
```

### 6.3 주의사항

- PK·UK 제약에 인덱스가 자동 생성되므로 중복 생성하지 않는다.
- 컬럼 선택도(cardinality)가 낮은 Boolean 단독 인덱스는 효과 없음. 복합으로 구성.
- 틱 데이터는 TimescaleDB의 `create_hypertable`로 청크 자동 분할 — 수동 파티션 불필요.
- JSONB 전체 검색이 필요하면 `GIN` 인덱스, 특정 키 경로만이면 함수 인덱스.

```sql
-- JSONB 특정 경로 인덱스
CREATE INDEX idx_notifications_meta_symbol
    ON notification.notifications ((meta->>'symbol'))
    WHERE meta ? 'symbol';
```

---

## 7. ENUM 타입

### 7.1 정의 방식

PostgreSQL 네이티브 ENUM을 사용한다. CHECK 제약 대비 저장 공간 효율적이며 `pg_enum` 카탈로그로 관리.

```sql
-- 스키마 단위로 타입 정의
CREATE TYPE order_svc.order_type AS ENUM ('buy', 'sell');
CREATE TYPE order_svc.order_kind_type AS ENUM ('market', 'limit', 'ext_close');
CREATE TYPE order_svc.order_status_type AS ENUM (
    'pending', 'filled', 'cancelled', 'failed'
);
```

### 7.2 ENUM 확장 규칙

새 값 추가는 `ALTER TYPE ... ADD VALUE`로 가능하며 롤백 불가하므로 신중히.

```sql
-- 값 추가 (트랜잭션 외부에서 실행)
ALTER TYPE order_svc.order_kind_type ADD VALUE IF NOT EXISTS 'stop_limit';

-- 값 이름 변경 (PostgreSQL 10+)
ALTER TYPE order_svc.order_status_type RENAME VALUE 'failed' TO 'error';
```

값 삭제는 불가 — 불필요 값은 새 타입을 만들어 컬럼을 마이그레이션.

### 7.3 도메인별 표준 ENUM 목록

```sql
-- auth 스키마
CREATE TYPE auth.user_role_type AS ENUM ('USER', 'ADMIN');
CREATE TYPE auth.user_status_type AS ENUM ('active', 'suspended', 'withdrawn');
CREATE TYPE auth.oauth_provider_type AS ENUM ('google', 'kakao', 'naver');

-- order_svc 스키마
CREATE TYPE order_svc.order_type AS ENUM ('buy', 'sell');
CREATE TYPE order_svc.order_kind_type AS ENUM ('market', 'limit', 'ext_close');
CREATE TYPE order_svc.order_status_type AS ENUM (
    'pending', 'filled', 'cancelled', 'failed'
);

-- reservation 스키마
CREATE TYPE reservation.timing_type AS ENUM ('open', 'close', 'prev_close');
CREATE TYPE reservation.reservation_status_type AS ENUM (
    'reserved', 'executed', 'cancelled', 'failed', 'expired'
);

-- account 스키마
CREATE TYPE account.account_status_type AS ENUM ('active', 'inactive');
CREATE TYPE account.ledger_event_type AS ENUM (
    'deposit', 'withdraw', 'order_lock', 'order_release',
    'order_fill_debit', 'order_fill_credit', 'fee_debit', 'reset'
);

-- notification 스키마
CREATE TYPE notification.notification_type AS ENUM (
    'surge', 'crash', 'market_open', 'market_close',
    'order_executed', 'mission_complete'
);
CREATE TYPE notification.notification_status_type AS ENUM ('unread', 'read');

-- mission 스키마
CREATE TYPE mission.mission_category_type AS ENUM ('daily', 'weekly', 'special');
CREATE TYPE mission.mission_status_type AS ENUM (
    'available', 'in_progress', 'completed', 'failed', 'cancelled', 'expired'
);
CREATE TYPE mission.challenge_status_type AS ENUM ('upcoming', 'active', 'ended');

-- learning 스키마
CREATE TYPE learning.content_level_type AS ENUM (
    'beginner', 'intermediate', 'advanced'
);

-- user_svc 스키마
CREATE TYPE user_svc.invest_style_type AS ENUM (
    'conservative', 'balanced', 'aggressive', 'momentum'
);
```

---

## 8. 금액·수량 처리

### 8.1 KRW 금액

**모든 원화 금액은 `BIGINT`, 단위는 원(₩)**. 소수점 없음.

```sql
amount_krw      BIGINT NOT NULL,   -- 주석: 단위 원
fee_krw         BIGINT NOT NULL DEFAULT 0,
cash_krw        BIGINT NOT NULL DEFAULT 0,
locked_krw      BIGINT NOT NULL DEFAULT 0,
price_krw       BIGINT,            -- 지정가 주문에만 존재
```

- 컬럼명 접미사 `_krw`로 통화 단위를 명시한다.
- 해외 주식·달러 금액이 도입되면 `_usd` 또는 `_amount` + 별도 `currency` 컬럼.
- `NUMERIC(20,0)`은 정확하나 `BIGINT`보다 느림 → KRW는 `BIGINT` 고정.

```sql
-- 잘못됨
price       FLOAT,          -- 부동소수점 금지
amount      DECIMAL(15,2),  -- 소수점 금지 (KRW)
fee         INT,            -- 오버플로우 위험
```

### 8.2 수익률·비율

```sql
return_percent  NUMERIC(10, 4) NOT NULL DEFAULT 0,   -- 예: 18.3600
change_percent  NUMERIC(10, 4) NOT NULL DEFAULT 0,
fee_rate        NUMERIC(8, 6)  NOT NULL DEFAULT 0.000150,  -- 0.015%
```

- `NUMERIC(precision, scale)` 사용. `FLOAT/DOUBLE PRECISION` 금지.
- 비율은 퍼센트 단위로 저장 (`0.15`가 아닌 `0.1500`).

### 8.3 수량 (주식 수)

```sql
quantity    BIGINT NOT NULL,    -- 주식 수, 항상 양수
```

소수점 거래(ETF 단위 분할 등)를 지원하게 되면 `NUMERIC(20, 8)`로 마이그레이션.

### 8.4 CHECK 제약

```sql
CONSTRAINT ck_orders_amount_positive  CHECK (amount_krw > 0),
CONSTRAINT ck_orders_fee_nonneg       CHECK (fee_krw >= 0),
CONSTRAINT ck_orders_quantity_pos     CHECK (quantity > 0),
CONSTRAINT ck_cash_nonneg             CHECK (cash_krw >= 0),
```

---

## 9. 아웃박스 테이블

각 서비스 스키마에 `outbox_events` 테이블을 둔다. CDC 발행기(Debezium 등)가 이 테이블을 감지해 메시지 브로커로 릴레이.

### 9.1 표준 스키마

```sql
CREATE TABLE {schema}.outbox_events (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aggregate_type  TEXT        NOT NULL,   -- 예: 'Order', 'Reservation'
    aggregate_id    UUID        NOT NULL,   -- 이벤트 주체 ID
    event_type      TEXT        NOT NULL,   -- 예: 'OrderPlaced', 'OrderCancelled'
    payload         JSONB       NOT NULL,
    published_at    TIMESTAMPTZ,            -- NULL = 미발행
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_outbox_{schema} PRIMARY KEY (id)
);

-- 미발행 이벤트 폴링 인덱스
CREATE INDEX idx_outbox_{schema}_unpublished
    ON {schema}.outbox_events (created_at ASC)
    WHERE published_at IS NULL;
```

### 9.2 삽입 예시 (주문 취소 트랜잭션 내부)

```sql
-- 1. 주문 상태 변경
UPDATE order_svc.orders
   SET status = 'cancelled', updated_at = now()
 WHERE id = $order_id;

-- 2. 동일 트랜잭션에서 아웃박스 기록
INSERT INTO order_svc.outbox_events
    (aggregate_type, aggregate_id, event_type, payload)
VALUES
    ('Order', $order_id, 'OrderCancelled', jsonb_build_object(
        'orderId',    $order_id,
        'userId',     $user_id,
        'accountId',  $account_id,
        'amountKrw',  $amount_krw,
        'feeKrw',     $fee_krw,
        'cancelledAt', now()
    ));
```

### 9.3 보존 정책

발행 완료(`published_at IS NOT NULL`) 레코드는 30일 후 삭제.

```sql
-- 배치 정리 (pg_cron 또는 외부 스케줄러)
DELETE FROM {schema}.outbox_events
 WHERE published_at IS NOT NULL
   AND published_at < now() - INTERVAL '30 days';
```

---

## 10. 멱등성 테이블

쓰기 API의 중복 요청 방지. 각 서비스가 `idempotency_keys` 테이블을 소유.

```sql
CREATE TABLE {schema}.idempotency_keys (
    idempotency_key TEXT        PRIMARY KEY,
    request_hash    TEXT        NOT NULL,       -- SHA-256(request body)
    response_body   JSONB       NOT NULL,
    status_code     SMALLINT    NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',

    CONSTRAINT pk_idempotency_{schema} PRIMARY KEY (idempotency_key)
);

-- 만료 키 정리
CREATE INDEX idx_idempotency_{schema}_expires
    ON {schema}.idempotency_keys (expires_at)
    WHERE expires_at < now();
```

동일한 `idempotency_key`로 요청이 오면 저장된 `response_body`/`status_code`를 그대로 반환하고 재처리하지 않는다.

---

## 11. 서비스별 테이블 설계

### 11.1 AuthService — `auth` 스키마

```sql
-- OAuth 세션 원장 (JWT 발급 기록)
CREATE TABLE auth.sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    refresh_token   TEXT        NOT NULL,
    jti             TEXT        NOT NULL,   -- JWT ID (Access Token 클레임)
    provider        auth.oauth_provider_type,
    is_revoked      BOOLEAN     NOT NULL DEFAULT false,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_sessions_refresh_token UNIQUE (refresh_token),
    CONSTRAINT uq_sessions_jti           UNIQUE (jti)
);

CREATE INDEX idx_sessions_user_id ON auth.sessions (user_id)
    WHERE is_revoked = false;
```

### 11.2 AccountService — `account` 스키마

```sql
-- 계좌 원장
CREATE TABLE account.accounts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    status          account.account_status_type NOT NULL DEFAULT 'active',
    cash_krw        BIGINT      NOT NULL DEFAULT 100000000,   -- 초기 1억
    locked_krw      BIGINT      NOT NULL DEFAULT 0,
    version         BIGINT      NOT NULL DEFAULT 0,           -- 낙관적 잠금
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_accounts_user_id   UNIQUE (user_id),
    CONSTRAINT ck_accounts_cash_nonneg   CHECK (cash_krw >= 0),
    CONSTRAINT ck_accounts_locked_nonneg CHECK (locked_krw >= 0)
);

-- 현금 원장 이벤트 (불변 append-only)
CREATE TABLE account.cash_ledger_entries (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id      UUID        NOT NULL,
    event_type      account.ledger_event_type NOT NULL,
    delta_krw       BIGINT      NOT NULL,     -- 양수=입금, 음수=출금
    balance_after   BIGINT      NOT NULL,     -- 이벤트 후 잔고 스냅샷
    reference_id    UUID,                     -- 관련 주문/예약 ID
    reference_type  TEXT,                     -- 'order', 'reservation', 'reward'
    memo            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_ledger_account_id
    ON account.cash_ledger_entries (account_id, created_at DESC);
```

### 11.3 OrderService — `order_svc` 스키마

```sql
CREATE TABLE order_svc.orders (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    account_id      UUID        NOT NULL,
    symbol          VARCHAR(20) NOT NULL,
    type            order_svc.order_type        NOT NULL,
    order_kind      order_svc.order_kind_type   NOT NULL,
    quantity        BIGINT      NOT NULL,
    price_krw       BIGINT,                     -- 지정가만 존재
    amount_krw      BIGINT      NOT NULL,
    fee_krw         BIGINT      NOT NULL DEFAULT 0,
    status          order_svc.order_status_type NOT NULL DEFAULT 'pending',
    parent_order_id UUID,                       -- 정정 원주문 참조
    idempotency_key TEXT        NOT NULL,
    executed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_orders_idempotency_key      UNIQUE (idempotency_key),
    CONSTRAINT fk_orders_orders_parent
        FOREIGN KEY (parent_order_id) REFERENCES order_svc.orders(id),
    CONSTRAINT ck_orders_quantity_positive    CHECK (quantity > 0),
    CONSTRAINT ck_orders_amount_positive      CHECK (amount_krw > 0),
    CONSTRAINT ck_orders_fee_nonneg           CHECK (fee_krw >= 0),
    CONSTRAINT ck_orders_limit_needs_price
        CHECK (order_kind != 'limit' OR price_krw IS NOT NULL),
    CONSTRAINT ck_orders_price_positive
        CHECK (price_krw IS NULL OR price_krw > 0)
);

CREATE INDEX idx_orders_user_id_status
    ON order_svc.orders (user_id, status, created_at DESC);
CREATE INDEX idx_orders_symbol
    ON order_svc.orders (symbol, created_at DESC)
    WHERE status = 'pending';
```

### 11.4 ReservationService — `reservation` 스키마

```sql
CREATE TABLE reservation.reservations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    account_id      UUID        NOT NULL,
    symbol          VARCHAR(20) NOT NULL,
    type            order_svc.order_type              NOT NULL,
    timing          reservation.timing_type           NOT NULL,
    order_kind      order_svc.order_kind_type         NOT NULL,
    quantity        BIGINT      NOT NULL,
    price_krw       BIGINT,
    scheduled_date  DATE        NOT NULL,
    amount_krw      BIGINT      NOT NULL,
    fee_krw         BIGINT      NOT NULL DEFAULT 0,
    status          reservation.reservation_status_type NOT NULL DEFAULT 'reserved',
    parent_order_id UUID,
    idempotency_key TEXT        NOT NULL,
    executed_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_reservations_idempotency UNIQUE (idempotency_key),
    CONSTRAINT ck_reservations_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ck_reservations_amount_positive   CHECK (amount_krw > 0),
    CONSTRAINT ck_reservations_timing_kind
        CHECK (
            (timing = 'open' AND order_kind IN ('market', 'limit'))
            OR
            (timing IN ('close', 'prev_close') AND order_kind = 'ext_close')
        )
);
```

### 11.5 HoldingService — `holding` 스키마

```sql
-- 보유종목 조회 모델 (OrderFilled 이벤트 기반 프로젝션, append-only로 갱신)
CREATE TABLE holding.holdings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    account_id      UUID        NOT NULL,
    symbol          VARCHAR(20) NOT NULL,
    name            TEXT        NOT NULL,
    quantity        BIGINT      NOT NULL DEFAULT 0,
    avg_price_krw   BIGINT      NOT NULL,       -- 평균 매수가
    total_cost_krw  BIGINT      NOT NULL,       -- 총 매수 원가
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_holdings_user_symbol UNIQUE (user_id, symbol),
    CONSTRAINT ck_holdings_quantity_nonneg  CHECK (quantity >= 0),
    CONSTRAINT ck_holdings_avg_price_pos    CHECK (avg_price_krw > 0)
);

-- 미실현 손익은 DB에 저장하지 않음 — 현재가(MarketService)와 조합해 BFF에서 계산
```

### 11.6 NotificationService — `notification` 스키마

```sql
CREATE TABLE notification.notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    type            notification.notification_type   NOT NULL,
    title           TEXT        NOT NULL,
    body            TEXT        NOT NULL,
    status          notification.notification_status_type NOT NULL DEFAULT 'unread',
    meta            JSONB,                           -- 타입별 추가 데이터
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id_status
    ON notification.notifications (user_id, triggered_at DESC)
    WHERE status = 'unread';

CREATE INDEX idx_notifications_meta_symbol
    ON notification.notifications ((meta->>'symbol'))
    WHERE meta ? 'symbol';

-- 30일 지난 알림 자동 삭제 (pg_cron 사용)
-- DELETE FROM notification.notifications WHERE created_at < now() - INTERVAL '30 days';
```

### 11.7 MarketService — `market` 스키마 (TimescaleDB)

```sql
-- 종목 마스터
CREATE TABLE market.stocks (
    symbol          VARCHAR(20) PRIMARY KEY,
    name            TEXT        NOT NULL,
    exchange        TEXT        NOT NULL,        -- KOSPI, KOSDAQ, NYSE, NASDAQ
    sector          TEXT,
    currency        VARCHAR(3)  NOT NULL DEFAULT 'KRW',
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 틱 데이터 (TimescaleDB hypertable)
CREATE TABLE market.ticks (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY,
    symbol          VARCHAR(20) NOT NULL,
    price_krw       BIGINT      NOT NULL,
    volume          BIGINT      NOT NULL DEFAULT 0,
    ticked_at       TIMESTAMPTZ NOT NULL,

    CONSTRAINT ck_ticks_price_positive  CHECK (price_krw > 0),
    CONSTRAINT ck_ticks_volume_nonneg   CHECK (volume >= 0)
);

-- TimescaleDB 청크 분할 (7일 단위)
SELECT create_hypertable('market.ticks', 'ticked_at', chunk_time_interval => INTERVAL '7 days');

-- 분봉 자동 집계 (continuous aggregate)
CREATE MATERIALIZED VIEW market.ticks_1min
    WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', ticked_at) AS bucket,
    symbol,
    first(price_krw, ticked_at) AS open_krw,
    max(price_krw)              AS high_krw,
    min(price_krw)              AS low_krw,
    last(price_krw, ticked_at)  AS close_krw,
    sum(volume)                 AS volume
FROM market.ticks
GROUP BY bucket, symbol;

-- 일봉 집계
CREATE MATERIALIZED VIEW market.ticks_1day
    WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', ticked_at) AS bucket,
    symbol,
    first(price_krw, ticked_at) AS open_krw,
    max(price_krw)              AS high_krw,
    min(price_krw)              AS low_krw,
    last(price_krw, ticked_at)  AS close_krw,
    sum(volume)                 AS volume
FROM market.ticks
GROUP BY bucket, symbol;
```

### 11.8 MissionService — `mission` 스키마

```sql
CREATE TABLE mission.missions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    category        mission.mission_category_type NOT NULL,
    title           TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    icon            TEXT,
    reward_points   BIGINT      NOT NULL DEFAULT 0,
    badge_reward    TEXT,
    total           BIGINT      NOT NULL DEFAULT 1,   -- 달성 목표치
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_missions_total_positive    CHECK (total > 0),
    CONSTRAINT ck_missions_reward_nonneg     CHECK (reward_points >= 0),
    CONSTRAINT ck_missions_date_range        CHECK (starts_at < ends_at)
);

CREATE TABLE mission.mission_participants (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id      UUID        NOT NULL REFERENCES mission.missions(id),
    user_id         UUID        NOT NULL,
    status          mission.mission_status_type NOT NULL DEFAULT 'in_progress',
    progress        BIGINT      NOT NULL DEFAULT 0,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    claimed_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_mission_participants_mission_user UNIQUE (mission_id, user_id),
    CONSTRAINT ck_mission_participants_progress_nonneg CHECK (progress >= 0)
);
```

### 11.9 LearningService — `learning` 스키마

```sql
CREATE TABLE learning.contents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    description     TEXT,
    category        TEXT        NOT NULL,
    level           learning.content_level_type NOT NULL,
    body            TEXT,
    duration_min    SMALLINT    NOT NULL DEFAULT 0,
    xp_reward       BIGINT      NOT NULL DEFAULT 0,
    keywords        TEXT[]      NOT NULL DEFAULT '{}',
    is_published    BOOLEAN     NOT NULL DEFAULT false,
    read_count      BIGINT      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learning.user_content_states (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    content_id      UUID        NOT NULL REFERENCES learning.contents(id),
    progress_pct    SMALLINT    NOT NULL DEFAULT 0,  -- 0~100
    is_completed    BOOLEAN     NOT NULL DEFAULT false,
    is_favorite     BOOLEAN     NOT NULL DEFAULT false,
    completed_at    TIMESTAMPTZ,
    last_read_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_content_states_user_content UNIQUE (user_id, content_id),
    CONSTRAINT ck_user_content_states_progress
        CHECK (progress_pct BETWEEN 0 AND 100)
);
```

---

## 12. 마이그레이션 규칙

### 12.1 파일 네이밍

```
V{버전}__{설명}.sql

V001__create_auth_schema.sql
V002__create_account_tables.sql
V003__add_idempotency_key_to_orders.sql
V042__add_challenge_badge_reward_column.sql
```

- 버전은 3자리 이상 숫자, 순번 유지.
- 설명은 `snake_case`, 동작을 명시 (`add_`, `drop_`, `create_`, `alter_`, `rename_`).
- Flyway 또는 Liquibase 기준으로 관리.

### 12.2 무중단 변경 원칙

| 작업 | 무중단 | 주의 |
|---|---|---|
| 컬럼 추가 (`DEFAULT NULL`) | 안전 | DEFAULT NOT NULL이면 테이블 락 |
| 컬럼 추가 (`DEFAULT 상수`) | PostgreSQL 11+ 안전 | 이전 버전은 풀 리라이트 |
| 컬럼 이름 변경 | 위험 | 앱 배포 후 구 컬럼 삭제하는 2단계 마이그레이션 |
| 인덱스 생성 | `CONCURRENTLY` 필수 | 락 없음 |
| 인덱스 삭제 | `CONCURRENTLY` 사용 | — |
| ENUM 값 추가 | 안전 | 트랜잭션 밖에서 실행 |
| 컬럼 삭제 | 앱 배포 후 진행 | 앱이 해당 컬럼 참조 여부 확인 필수 |

```sql
-- 올바른 인덱스 생성 (서비스 중단 없음)
CREATE INDEX CONCURRENTLY idx_orders_symbol
    ON order_svc.orders (symbol, created_at DESC);

-- 잘못됨 (CONCURRENTLY 누락 → 테이블 락)
CREATE INDEX idx_orders_symbol ON order_svc.orders (symbol);
```

### 12.3 컬럼 삭제 2단계

```sql
-- Step 1 (현재 배포): 컬럼을 사용하지 않도록 앱 수정 후 배포
-- Step 2 (다음 배포): 컬럼 삭제
ALTER TABLE order_svc.orders DROP COLUMN IF EXISTS legacy_field;
```

---

## 13. 금지 사항

| 금지 | 이유 | 대안 |
|---|---|---|
| `TIMESTAMP` (시간대 없음) | KST/UTC 혼재 버그 | `TIMESTAMPTZ` |
| `FLOAT`, `DOUBLE PRECISION` 금액 | 부동소수점 오차 | `BIGINT`(KRW), `NUMERIC(p,s)`(비율) |
| `VARCHAR(255)` 텍스트 | PostgreSQL에서 `TEXT`와 성능 동일, 임의 제한 | `TEXT` 또는 근거 있는 `VARCHAR(n)` |
| `CHAR(n)` | 패딩 문제 | `VARCHAR(n)` 또는 `TEXT` |
| 크로스 스키마 FK | 서비스 간 결합도 증가 | UUID 복사 저장 |
| `SELECT *` 마이그레이션 뷰 | 컬럼 추가 시 뷰 깨짐 | 컬럼 명시 |
| 시퀀스를 직접 점프 | 감사 불가 | `GENERATED ALWAYS AS IDENTITY` |
| 애플리케이션에서 잔고 계산 후 직접 UPDATE | 정합성 보장 불가 | 원장 이벤트 + DB 트랜잭션 내 계산 |
| JSON 중첩 3단계 이상 | 쿼리 불가능 | 정규화 또는 검색 컬럼 추출 |
| `BOOLEAN`을 `0/1 INT`로 저장 | 타입 의미 손실 | `BOOLEAN NOT NULL` |
| `NULL`을 `''`(빈 문자열)로 대체 | 의미 불명확 | 명시적 `NULL` 또는 `NOT NULL DEFAULT ''` |
| 서비스 운영 중 컬럼 `NOT NULL` 추가 (기존 데이터 없이) | 테이블 락 + 기존 행 오류 | DEFAULT 제공 후 별도 UPDATE, 이후 NOT NULL |
