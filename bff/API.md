# Candle BFF — API 명세서

Candle 모의투자 플랫폼의 Backend-for-Frontend(BFF) API 문서입니다.
모든 응답/요청 스키마는 [`@candle/shared`](../shared/src)의 TypeBox 정의를 단일 소스로 사용하며,
이 문서는 그 계약을 사람이 읽기 좋게 정리한 것입니다.

> 런타임 OpenAPI 문서(Swagger UI)는 서버 기동 후 **`GET /docs`** 에서 확인할 수 있습니다.

---

## 기본 정보

| 항목 | 값 |
|---|---|
| Base URL (로컬) | `http://localhost:4000` |
| 도메인 API 프리픽스 | `/api` |
| 콘텐츠 타입 | `application/json` |
| 인증 | Bearer 토큰 (현재 **mock** — 검증/발급 미구현, 아래 참고) |
| 데이터 소스 | `DATA_SOURCE` 환경변수: `mock`(기본) \| `grpc`(마이크로서비스) \| `kis`(예정) |
| CORS 허용 출처 | `CORS_ORIGINS` 환경변수 (기본: capacitor/localhost/`localhost:3000`) |

### 프론트엔드 연동
웹앱(`webapp`)은 `src/apis/`의 클라이언트를 통해서만 BFF에 접근합니다.
Base URL은 `NEXT_PUBLIC_API_BASE_URL` 환경변수로 주입됩니다(기본 `http://localhost:4000`).

### 인증에 대한 주의
인증은 **OAuth2.0 + JWT 모델**이지만 현재 BFF는 **모킹**입니다. `/api/auth/oauth/{provider}`가
Access/Refresh 토큰과 사용자(role/status)를 합성해 내려주고, `/api/auth/token/*`로 재발급·검증을 흉내냅니다.
Access Token은 서명 없는 base64url payload(`header.payload.mock-signature`)라 `exp`/`role` 클레임은
실제처럼 디코드되지만 **서명 검증은 하지 않습니다**(AUTH-016은 실 Auth Service 책임).

웹앱은 토큰을 `localStorage`에 보관(`candle-auth`)하고, API 클라이언트가 `Authorization: Bearer`를 자동
첨부하며 **401 시 Refresh Token으로 1회 자동 재발급 후 재시도**합니다(AUTH-007/009). 보호 자원 강제는
실 서비스에서 적용됩니다(목은 토큰을 요구하지 않음).

### 에러 응답 (공통)
2xx가 아닌 모든 응답은 Fastify 기본 에러 봉투 형태를 따릅니다.

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Unknown symbol: ZZZZ"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `statusCode` | number | HTTP 상태 코드 |
| `error` | string | 상태 코드 텍스트 |
| `message` | string | 사람이 읽을 수 있는 메시지 |

### 쓰기(mutation) 응답 컨벤션
모든 쓰기 엔드포인트(POST/PUT/PATCH/DELETE)는 아래 규칙을 따릅니다. 현재 BFF는 **저장/부수효과 없이 응답만
합성(synthesize)**해 내려주며, 마이크로서비스가 이 계약을 그대로 구현하면 됩니다.

| 동작 | 상태 코드 | 본문 |
|---|---|---|
| 생성 | `201 Created` | 생성된 리소스 |
| 수정(PATCH/PUT) | `200 OK` | 수정된 리소스 |
| 삭제 | `204 No Content` | 없음 |
| 행위(claim/reset/complete 등) | `200 OK` | 행위 결과 객체(영향 리소스 + 부가정보) |
| 검증 실패 | `400` | 에러 봉투 |
| 미존재 | `404` | 에러 봉투 |
| 상태 충돌(예: 미완료 미션 수령) | `409` | 에러 봉투 |

합성 응답에는 항상 `id`/타임스탬프(`*At`)가 포함되어 실데이터와 동일한 형태를 유지합니다.

---

## 엔드포인트 목록

| 메서드 | 경로 | 설명 | 태그 |
|---|---|---|---|
| GET | `/health` | 헬스체크 | system |
| GET | `/api/auth/providers` | 지원 OAuth Provider 목록 | auth |
| POST | `/api/auth/oauth/{provider}` | OAuth 로그인/자동 회원가입 | auth |
| POST | `/api/auth/token/refresh` | Access Token 재발급 | auth |
| POST | `/api/auth/token/validate` | JWT 유효성 검증 | auth |
| POST | `/api/auth/logout` | 로그아웃(Refresh Token 폐기) | auth |
| GET | `/api/auth/me` | 현재 사용자 | auth |
| PATCH | `/api/auth/me` | 프로필 수정 | auth |
| DELETE | `/api/auth/me` | 계정 삭제 | auth |
| POST | `/api/auth/signup` | 회원가입 (legacy) | auth |
| POST | `/api/auth/login` | 로그인 (legacy) | auth |
| GET | `/api/users/me` | 사용자 정보 조회 | user |
| PATCH | `/api/users/me` | 프로필 수정(닉네임/이미지/투자성향) | user |
| GET | `/api/users/nickname/check` | 닉네임 중복 검사 | user |
| POST | `/api/users/me/withdraw` | 회원 탈퇴 | user |
| GET | `/api/users/me/summary` | 마이페이지 집계 | user |
| GET | `/api/market/status` | 장 운영 상태(정규장/마감) | market |
| GET | `/api/market/stocks` | 종목 목록/검색 | market |
| GET | `/api/market/movers` | 시장 동향(상승/하락/거래상위) | market |
| GET | `/api/market/stocks/{symbol}` | 종목 상세 | market |
| GET | `/api/market/stocks/{symbol}/candles` | 캔들(OHLCV) 데이터 | market |
| GET | `/api/market/stocks/{symbol}/news` | 종목 뉴스 | market |
| GET | `/api/market/stocks/{symbol}/intraday` | 당일 실시간 틱 히스토리 | market |
| GET | `/api/market/sparklines` | 전 종목 2주 스파크라인 벌크 조회 | market |
| GET | `/api/account` | 계좌 요약(대시보드 통계) | account |
| GET | `/api/account/balance` | 잔고 분리 조회(총/묶인/가용) | account |
| GET | `/api/account/locked` | 미체결 지정가 주문(묶인 금액 원천) | account |
| GET | `/api/account/holdings` | 보유 종목 목록 | account |
| GET | `/api/account/holdings/{symbol}` | 보유 종목 상세 | account |
| GET | `/api/account/transactions` | 거래 내역 | account |
| GET | `/api/account/portfolio-history` | 포트폴리오 자산 추이 | account |
| GET | `/api/account/allocation` | 섹터별 자산 구성 | account |
| GET | `/api/account/orders` | 주문 목록 조회 | account |
| GET | `/api/account/orders/{id}` | 주문 상세 조회 | account |
| POST | `/api/account/orders` | 매수/매도 주문(시장가/지정가) | account |
| DELETE | `/api/account/orders/{id}` | 주문 취소 | account |
| PATCH | `/api/account/orders/{id}` | 지정가 주문 정정 | account |
| GET | `/api/account/reservations` | 예약 주문 목록 (RSV-009) | account |
| GET | `/api/account/reservations/{id}` | 예약 주문 상세 | account |
| POST | `/api/account/reservations` | 예약 주문 생성 | account |
| DELETE | `/api/account/reservations/{id}` | 예약 주문 취소 | account |
| PATCH | `/api/account/reservations/{id}` | 예약 주문 정정 | account |
| POST | `/api/account/reset` | 계정 초기화(포트폴리오 리셋) | account |
| POST | `/api/account/deactivate` | 계좌 비활성화(탈퇴 이벤트 처리) | account |
| GET | `/api/account/watchlist` | 관심종목 목록 | account |
| POST | `/api/account/watchlist` | 관심종목 추가 | account |
| DELETE | `/api/account/watchlist/{symbol}` | 관심종목 제거 | account |
| GET | `/api/notifications` | 알림 목록 | notification |
| GET | `/api/notifications/unread-count` | 읽지 않은 알림 수 | notification |
| PATCH | `/api/notifications/{id}/read` | 단건 읽음 처리 | notification |
| PATCH | `/api/notifications/read-all` | 전체 읽음 처리 | notification |
| DELETE | `/api/notifications/{id}` | 알림 삭제 | notification |
| GET | `/api/rankings` | 투자 랭킹 | ranking |
| GET | `/api/rankings/me` | 내 랭킹 | ranking |
| GET | `/api/missions` | 미션/챌린지 목록 | mission |
| GET | `/api/missions/progress` | 내 미션 진행 상태 요약 | mission |
| GET | `/api/missions/challenges` | 챌린지 목록 | mission |
| GET | `/api/missions/challenges/{id}` | 챌린지 상세 | mission |
| POST | `/api/missions/challenges/{id}/join` | 챌린지 참여 | mission |
| GET | `/api/missions/challenges/{id}/result` | 챌린지 결과 조회 | mission |
| GET | `/api/missions/{id}` | 미션 상세 | mission |
| POST | `/api/missions/{id}/join` | 미션 참여 | mission |
| DELETE | `/api/missions/{id}/participation` | 미션 참여 취소 | mission |
| POST | `/api/missions/{id}/claim` | 미션 보상 수령 | mission |
| POST | `/api/missions/{id}/progress` | 미션 진행도 갱신 | mission |
| POST | `/api/missions/admin` | 관리자 미션 생성 | mission |
| PUT | `/api/missions/admin/{id}` | 관리자 미션 수정 | mission |
| DELETE | `/api/missions/admin/{id}` | 관리자 미션 삭제 | mission |
| GET | `/api/missions/admin/{id}/participants` | 관리자 참여자 조회 | mission |
| GET | `/api/missions/admin/{id}/stats` | 관리자 미션 통계 | mission |
| POST | `/api/missions/challenges/admin` | 관리자 챌린지 생성 | mission |
| GET | `/api/learn` | 학습 콘텐츠 목록 | learn |
| GET | `/api/learn/progress` | 내 학습 진도율 | learn |
| GET | `/api/learn/favorites` | 즐겨찾기 콘텐츠 | learn |
| GET | `/api/learn/recommended` | 추천 콘텐츠 | learn |
| GET | `/api/learn/{id}` | 학습 콘텐츠 상세 | learn |
| POST | `/api/learn/{id}/complete` | 학습 콘텐츠 완독 처리 | learn |
| POST | `/api/learn/{id}/favorite` | 즐겨찾기 등록/해제 | learn |

---

## System

### `GET /health`
헬스체크.

**응답 `200`**

```json
{ "status": "ok", "uptime": 4.98, "timestamp": "2026-06-16T12:29:34.608Z" }
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `status` | `"ok"` | 고정값 |
| `uptime` | number | 프로세스 가동 시간(초) |
| `timestamp` | string(date-time) | 현재 서버 시각 |

---

## Auth

> **아키텍처**: 로그인은 **Auth Service**가 소유하는 순차 트랜잭션입니다 —
> OAuth 검증 → Provider ID로 사용자 식별(AUTH-004) → 신규면 User Service에 생성 요청(AUTH-013) →
> 사용자 상태 확인(AUTH-014) → 실패 시 롤백(AUTH-018) → 토큰 발급. **BFF는 이 합성 결과만 위임/전달**하며,
> User Service에 별도 병렬 호출을 하지 않습니다(병렬 gRPC 팬아웃은 로그인 이후 읽기 합성에만 사용).
> JWT 서명/검증(AUTH-016)·중복 가입 방지(AUTH-017)도 Auth Service 책임이라 목 범위 밖입니다.

### `GET /api/auth/providers`
지원 OAuth Provider 목록. *(AUTH-003)*

**응답 `200`** — [`ProviderInfo`](#providerinfo)`[]`

```json
[ { "id": "google", "name": "Google", "color": "#4285F4" },
  { "id": "kakao", "name": "카카오", "color": "#FEE500" },
  { "id": "naver", "name": "네이버", "color": "#03C75A" } ]
```

### `POST /api/auth/oauth/{provider}`
OAuth 로그인 / 최초 로그인 시 자동 회원가입. *(AUTH-001/002/004/005/006)*

**경로 파라미터**: `provider` — `google` | `kakao` | `naver`
**쿼리** — [`OAuthLoginQuery`](#oauthloginquery) `as`: `existing`(기본) | `new` | `suspended` *(목 시나리오 셀렉터)*

**응답 `200`** — [`OAuthLoginResult`](#oauthloginresult) · **`403`** — 비활성/정지 계정(AUTH-014)

```json
{
  "tokens": { "accessToken": "<jwt>", "refreshToken": "refresh.<...>", "tokenType": "Bearer", "expiresIn": 3600, "refreshExpiresIn": 1209600 },
  "user": { "id": "u_demo", "username": "박유빈", "email": "demo@candle.app", "avatar": "🐯", "role": "USER", "status": "active", "provider": "google", "createdAt": "2026-01-02T09:00:00+09:00" },
  "isNewUser": false
}
```

### `POST /api/auth/token/refresh`
Refresh Token으로 Access Token 재발급. *(AUTH-007)*

**요청 본문** — [`RefreshTokenBody`](#refreshtokenbody) `{ "refreshToken": "refresh.xxx" }`

**응답 `200`** — [`RefreshTokenResult`](#refreshtokenresult) · **`401`** — 폐기/무효 토큰(AUTH-009)

```json
{ "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 3600 }
```

### `POST /api/auth/token/validate`
JWT 유효성/만료 검증. *(AUTH-008/009)*

**요청 본문** — [`TokenValidateBody`](#tokenvalidatebody) `{ "token": "<jwt>" }`

**응답 `200`** — [`TokenValidateResult`](#tokenvalidateresult)

```json
{ "valid": true, "role": "USER", "expiresAt": "2026-06-17T14:16:42.000Z" }
```

### `POST /api/auth/logout`
로그아웃 — Refresh Token 폐기 요청. *(AUTH-010)*

**요청 본문** — [`LogoutBody`](#logoutbody) `{ "refreshToken": "refresh.xxx" }` (선택)

**응답 `204`** (본문 없음)

### `GET /api/auth/me`
현재 사용자(데모 사용자).

**응답 `200`** — [`UserProfile`](#userprofile)

```json
{ "id": "u_demo", "username": "박유빈", "email": "demo@candle.app", "avatar": "🐯", "role": "USER", "status": "active", "provider": "google", "investStyle": "balanced", "createdAt": "2026-01-02T09:00:00+09:00" }
```

### `PATCH /api/auth/me`
프로필 수정(닉네임/아바타/투자성향). 전달한 필드만 병합해 합성 반환(미영속).

**요청 본문** — [`UpdateProfileBody`](#updateprofilebody) (모든 필드 선택) · **응답 `200`** — [`UserProfile`](#userprofile)

### `DELETE /api/auth/me`
계정 삭제(mock no-op). **응답 `204`**

### `POST /api/auth/signup` · `POST /api/auth/login` *(legacy)*
이메일/비밀번호 기반 — OAuth 요구사항 범위 밖의 개발용. 각각 `201`/`200`에 [`AuthResponse`](#authresponse) 반환.

---

## User

> **범위**: 회원 생성(USER-001)·상태 관리(USER-005)·Auth 매핑(USER-017)·상태 제공(USER-018)·감사
> (USER-022/023)·최소 저장(USER-024)은 실제 **User Service 내부 책임**이라 목 범위 밖이며, **관리자 기능
> (USER-019/020/021)은 제외**됩니다. 여기서는 조회/수정/탈퇴/중복검사/마이페이지 집계 계약만 제공합니다.

### `GET /api/users/me`
사용자 정보 조회. *(USER-002 · 이메일 USER-011 · 가입일 USER-022)*

**응답 `200`** — [`UserProfile`](#userprofile)

### `PATCH /api/users/me`
프로필 수정 — 닉네임/프로필 이미지/투자성향. *(USER-003/008/010)* 전달한 필드만 병합해 합성 반환(미영속).

**요청 본문** — [`UpdateProfileBody`](#updateprofilebody) · **응답 `200`** — [`UserProfile`](#userprofile)

### `GET /api/users/nickname/check`
닉네임 중복 검사. *(USER-009)*

**쿼리** — [`NicknameCheckQuery`](#nicknamecheckquery) `nickname` (2–20자)

**응답 `200`** — [`NicknameCheckResult`](#nicknamecheckresult)

```json
{ "nickname": "candle", "available": false }
```

### `POST /api/users/me/withdraw`
회원 탈퇴. *(USER-004/005)* 상태를 `withdrawn`으로 바꾼 프로필을 합성 반환하며, 이후 로그인은
`POST /auth/oauth/*`에서 **403**으로 차단됩니다. *(USER-006)*

**응답 `200`** — [`UserProfile`](#userprofile) (`status: "withdrawn"`)

### `GET /api/users/me/summary`
마이페이지 집계. *(USER-012~016)* BFF가 **User·Account·Ranking·Mission** 서비스 결과를 합성한 read 모델
(로그인 이후 병렬 read aggregation의 대표 예).

**응답 `200`** — [`MyPageSummary`](#mypagesummary)

```json
{
  "profile": { "id": "u_demo", "username": "박유빈", "email": "demo@candle.app", "...": "..." },
  "performance": { "totalReturnPercent": 18.36, "totalProfitLoss": 18360000 },
  "assets": { "totalAsset": 118360000, "cash": 2125780, "investedAmount": 17171820 },
  "ranking": { "rank": 4, "returnPercent": 18.36 },
  "challenges": { "active": 5, "completed": 3 }
}
```

---

## Market

### `GET /api/market/status`
장 운영 상태. *(ORD-012)* 평일 09:00~15:30 KST를 정규장으로 판정하며, 마감 시 즉시(시장가) 주문은
예약 주문으로 유도된다.

**응답 `200`** — [`MarketStatus`](#marketstatus)

```json
{ "open": false, "session": "closed", "asOf": "2026-06-17T13:47:21.958Z", "message": "정규장 시간이 아닙니다 ..." }
```

### `GET /api/market/stocks`
종목 목록/검색.

**쿼리 파라미터** — [`StockListQuery`](#stocklistquery)

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `q` | string | 선택 | 이름/종목코드 검색 |
| `exchange` | [`Exchange`](#enum-exchange) | 선택 | 거래소 필터 |
| `sector` | string | 선택 | 섹터 필터 |
| `limit` | integer (1–100) | 선택 | 최대 개수 |

**응답 `200`** — [`Quote`](#quote)`[]`

```json
[
  {
    "symbol": "005930", "name": "삼성전자", "exchange": "KOSPI", "currency": "KRW",
    "sector": "반도체", "price": 71400, "change": 800, "changePercent": 1.13,
    "prevClose": 70600, "open": 70497, "high": 71967, "low": 70342,
    "volume": 12300000, "marketCap": 426000000000000, "updatedAt": "2026-06-15T15:30:00+09:00"
  }
]
```

> 모든 금액/수량은 **원시 숫자**입니다(예: `marketCap: 426e12`). 표시 포맷팅(`426조` 등)은 프론트엔드 책임입니다.

### `GET /api/market/movers`
시장 동향. 등락률 상위/하위 5종목과 거래량 상위 5종목.

**응답 `200`** — [`MarketMovers`](#marketmovers)

```json
{ "gainers": [ /* Quote[] */ ], "losers": [ /* Quote[] */ ], "mostActive": [ /* Quote[] */ ] }
```

### `GET /api/market/stocks/{symbol}`
종목 상세(시세 + 펀더멘털 + 설명).

**경로 파라미터**: `symbol` (string) — 예: `005930`, `AAPL`

**응답 `200`** — [`StockDetail`](#stockdetail) · **`404`** — [`ErrorResponse`](#에러-응답-공통)

### `GET /api/market/stocks/{symbol}/candles`
캔들(OHLCV) 데이터.

**경로 파라미터**: `symbol` (string)
**쿼리 파라미터** — [`CandleQuery`](#candlequery)

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `interval` | [`CandleInterval`](#enum-candleinterval) | `1d` | 캔들 간격 |
| `limit` | integer (1–365) | `60` | 캔들 개수 |

**응답 `200`** — [`Candle`](#candle)`[]`

```json
[ { "date": "2026-04-21", "open": 60690, "high": 61200, "low": 60100, "close": 60850, "volume": 1320000 } ]
```

### `GET /api/market/stocks/{symbol}/news`
종목 뉴스.

**응답 `200`** — [`NewsItem`](#newsitem)`[]`

```json
[ { "id": "005930-n1", "symbol": "005930", "title": "삼성전자, 2분기 실적 시장 예상치 상회", "source": "한국경제", "publishedAt": "2026-06-15T13:30:00+09:00" } ]
```

### `GET /api/market/stocks/{symbol}/intraday`
당일 실시간 틱 히스토리. WebSocket(`ws://…/ws/quotes`)으로 스트리밍되는 틱을 메모리에 누적한 스냅샷이며,
차트의 초기 로드 및 연결 전 구간 보정에 사용합니다.

**경로 파라미터**: `symbol` (string)

**응답 `200`** — [`IntradayHistory`](#intradayhistory)

```json
{
  "symbol": "005930",
  "ticks": [
    { "time": "09:00", "price": 71200, "volume": 42000 },
    { "time": "09:05", "price": 71400, "volume": 38500 }
  ]
}
```

### `GET /api/market/sparklines`
전 종목의 2주(기본) 일봉 종가 배열을 단일 요청으로 반환합니다. 목록 화면에서 종목별로 개별 호출하는 대신
이 벌크 엔드포인트를 사용해 요청 수를 줄입니다.

**쿼리 파라미터**: `limit` (integer ≥ 1, 기본 `14`) — 조회할 일봉 개수

**응답 `200`** — `Record<string, number[]>` (심볼 → 종가 배열, 오래된 순)

```json
{
  "005930": [70600, 71200, 71400, 70800, 71600],
  "000660": [195000, 196500, 198000]
}
```

---

## Account

> 현재 데모 단일 계좌(`acc_demo` / `u_demo`)를 반환합니다.
> 계좌 **생성(ACC-001)·단일성(ACC-002)**은 Auth `UserRegistered` 이벤트를 받은 Account 서비스가
> 처리하는 내부 영역이라 BFF 모킹 범위 밖입니다. BFF는 조회/잔고/상태 계약만 제공합니다.

### `GET /api/account`
계좌 요약(대시보드 통계). *(ACC-003)*

**응답 `200`** — [`Account`](#account)

```json
{
  "accountId": "acc_demo", "userId": "u_demo", "status": "active", "currency": "KRW",
  "cash": 2125780, "lockedAmount": 832325, "totalAsset": 118360000, "investedAmount": 17171820,
  "totalProfitLoss": 18360000, "totalReturnPercent": 18.36,
  "todayProfitLoss": 285600, "todayReturnPercent": 0.24,
  "rank": 4, "updatedAt": "2026-06-15T15:30:00+09:00"
}
```

### `GET /api/account/balance`
잔고를 총/묶인/가용으로 분리 조회. *(ACC-004)* `lockedAmount`는 예약(미체결) 주문 합계입니다(아래 reservations 참고).

**응답 `200`** — [`AccountBalance`](#accountbalance)

```json
{ "totalBalance": 2958105, "lockedAmount": 832325, "availableAmount": 2125780 }
```

### `GET /api/account/locked`
미체결 지정가 주문이 묶어둔 금액 내역. 각 항목은 `status: "pending"`인 [`Transaction`](#transaction)이며,
`amount + fee` 합계가 `AccountBalance.lockedAmount`와 일치합니다.

**응답 `200`** — [`Transaction`](#transaction)`[]`

```json
[
  { "id": "r1", "type": "buy", "symbol": "000660", "name": "SK하이닉스", "quantity": 3, "price": 198500, "amount": 595500, "fee": 89, "status": "pending", "executedAt": "2026-06-15T14:05:00+09:00" }
]
```

### `GET /api/account/holdings`
보유 종목 목록.

**쿼리 파라미터**: `includeInactive` (boolean, 기본 `false`) — 비활성 포지션 포함 여부

**응답 `200`** — [`Holding`](#holding)`[]`

### `GET /api/account/holdings/{symbol}`
보유 종목 상세. *(HLD-003/HLD-011)*

**경로 파라미터**: `symbol` (string)

**응답 `200`** — [`Holding`](#holding) · **`404`** — 미보유 종목

### `GET /api/account/transactions`
거래 내역.

**쿼리 파라미터** — [`TransactionQuery`](#transactionquery)

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `limit` | integer (1–100) | 최대 개수 |
| `type` | [`TransactionType`](#enum-transactiontype) | `buy`/`sell` 필터 |

**응답 `200`** — [`Transaction`](#transaction)`[]`

### `GET /api/account/portfolio-history`
포트폴리오 자산 추이.

**쿼리 파라미터**: `days` (integer 1–365, 기본 `30`)

**응답 `200`** — [`PortfolioPoint`](#portfoliopoint)`[]`

```json
[ { "date": "2026-05-17", "value": 100120000 } ]
```

### `GET /api/account/allocation`
섹터별 자산 구성.

**응답 `200`** — [`SectorAllocation`](#sectorallocation)`[]`

```json
[ { "sector": "반도체", "value": 9173100, "percent": 38.0 } ]
```

> 색상은 응답에 포함되지 않습니다(프론트엔드가 섹터→색상 매핑).

### `GET /api/account/orders`
주문 목록 조회 *(ORD-004)* — 예약(pending)·체결(filled)·취소(cancelled) 통합.

**쿼리** — [`OrderListQuery`](#orderlistquery) `status?`, `symbol?`

**응답 `200`** — [`Transaction`](#transaction)`[]` (각 항목에 `orderKind` 포함)

### `GET /api/account/orders/{id}`
주문 상세 조회. *(ORD-005)*

**경로 파라미터**: `id` (string) · **응답 `200`** — [`Transaction`](#transaction) · **`404`** — 미존재

### `POST /api/account/orders`
매수/매도 주문 — 시장가/지정가. *(ORD-001~012)* **영속화하지 않고** 검증 후 체결/예약 결과를 합성 반환.

**요청 본문** — [`PlaceOrderBody`](#placeorderbody)

```json
{ "symbol": "005930", "type": "buy", "orderKind": "limit", "quantity": 3, "price": 70000 }
```

**검증 규칙**

| 코드 | 상황 | 요구사항 |
|---|---|---|
| `400` | 지정가인데 가격 없음 / 소수점 가격 | ORD-003 / ORD-011 |
| `404` | 알 수 없는 종목 | — |
| `409` | 동일 종목 PENDING 주문 존재 | ORD-009 |
| `422` | 매수 가용 금액 부족 | ORD-007 |
| `422` | 매도 보유 수량 초과 | ORD-008 |

**체결 상태**: 정규장 시장가 → `filled`, 지정가 또는 장 마감 시장가 → `pending`(예약, ORD-012).

**응답 `201`** — [`Transaction`](#transaction)

```json
{
  "id": "t_1781612985644", "type": "buy", "orderKind": "limit", "symbol": "005930", "name": "삼성전자",
  "quantity": 3, "price": 70000, "amount": 210000, "fee": 32,
  "status": "pending", "executedAt": "2026-06-16T12:29:45.644Z"
}
```

### `DELETE /api/account/orders/{id}`
주문 취소. *(CAN-001~004)* PENDING 상태의 지정가 주문만 취소 가능.

**경로 파라미터**: `id` (string)

**응답 `200`** — [`OrderCancelResult`](#ordercancelresult) · **`404`** — 미존재 · **`409`** — 이미 체결/취소

```json
{ "id": "t_x", "status": "cancelled", "releasedAmount": 210032, "cancelledAt": "2026-06-17T03:18:48.861Z" }
```

### `PATCH /api/account/orders/{id}`
지정가 주문 정정. *(CAN-005/007/008)* 원주문을 취소하고 수량·가격을 수정한 새 주문을 생성. PENDING 지정가만 정정 가능.

**경로 파라미터**: `id` (string)
**요청 본문** — [`AmendOrderBody`](#amendorderbody) `{ "quantity": 2, "price": 71000 }`

**응답 `201`** — [`Transaction`](#transaction) (신규 주문, `parentOrderId`로 원주문 참조) · **`404`** — 미존재 · **`409`** — 비정정 가능 상태

---

### `GET /api/account/reservations`
예약 주문 목록. *(RSV-009)* 정해진 시점(시가/종가)에 자동 체결되는 스케줄 주문 목록이며,
일반 지정가 주문(`/locked`)과 다른 별도 오브젝트입니다.

**쿼리 파라미터** — [`ReservationListQuery`](#reservationlistquery) `status?`

**응답 `200`** — [`Reservation`](#reservation)`[]`

```json
[
  {
    "id": "rsv_001", "symbol": "005930", "name": "삼성전자",
    "type": "buy", "timing": "open", "orderKind": "market",
    "quantity": 5, "scheduledDate": "2026-06-18",
    "amount": 357000, "fee": 54, "status": "reserved",
    "createdAt": "2026-06-17T10:30:00+09:00"
  }
]
```

### `GET /api/account/reservations/{id}`
예약 주문 상세.

**경로 파라미터**: `id` (string)

**응답 `200`** — [`Reservation`](#reservation) · **`404`** — 미존재

### `POST /api/account/reservations`
예약 주문 생성. *(RSV-001~007)*

**요청 본문** — [`CreateReservationBody`](#createreservationbody)

| 필드 | 타입 | 설명 |
|---|---|---|
| `symbol` | string | 종목코드 |
| `type` | `buy`\|`sell` | 매수/매도 |
| `timing` | `open`\|`close`\|`prev_close` | 시가/종가/시간외종가 시점 |
| `orderKind` | [`OrderKind`](#enum-orderkind) | 주문 종류 |
| `quantity` | integer | 수량 |
| `price` | number | 지정가(지정가일 때 필수, 정수) |
| `scheduledDate` | string(YYYY-MM-DD) | 실행 예정일(내일~7일 이내, `close`/`prev_close`일 때 필수) |

**시점별 허용 주문 종류**

| `timing` | 허용 `orderKind` |
|---|---|
| `open` | `market`, `limit` |
| `close` / `prev_close` | `ext_close`(시간외종가) |

**응답 `201`** — [`Reservation`](#reservation) · **`400`** — 시점/종류 불일치, 가격 오류, 날짜 범위 초과 · **`404`** — 미존재 종목 · **`422`** — 잔고/수량 부족

### `DELETE /api/account/reservations/{id}`
예약 주문 취소. *(RSV-016~018)* RESERVED 상태만 취소 가능.

**경로 파라미터**: `id` (string)

**응답 `204`** (본문 없음) · **`404`** — 미존재 · **`409`** — 비취소 가능 상태

### `PATCH /api/account/reservations/{id}`
예약 주문 정정. *(CAN-006~008)* 원예약을 취소하고 수정된 새 예약을 생성.

**경로 파라미터**: `id` (string)
**요청 본문** — [`AmendReservationBody`](#amendreservationbody) (모든 필드 선택)

| 필드 | 타입 | 설명 |
|---|---|---|
| `timing` | `open`\|`close`\|`prev_close` | 시점 변경 |
| `orderKind` | [`OrderKind`](#enum-orderkind) | 주문 종류 변경 |
| `quantity` | integer | 수량 변경 |
| `price` | number | 지정가 변경 |
| `scheduledDate` | string | 실행 예정일 변경 |

**응답 `201`** — [`Reservation`](#reservation) (신규, `parentOrderId`로 원예약 참조) · **`400`** / **`404`** / **`409`**

---

### `POST /api/account/reset`
계정 초기화(포트폴리오 리셋). 보유 종목을 모두 정리하고 시드캐피털(1억원)을 현금으로 되돌린 계좌를 합성 반환.

**응답 `200`** — [`Account`](#account)

```json
{ "accountId": "acc_demo", "userId": "u_demo", "status": "active", "currency": "KRW", "cash": 100000000, "lockedAmount": 0, "totalAsset": 100000000, "investedAmount": 0, "totalProfitLoss": 0, "totalReturnPercent": 0, "todayProfitLoss": 0, "todayReturnPercent": 0, "rank": 4, "updatedAt": "2026-06-17T03:18:48.861Z" }
```

### `POST /api/account/deactivate`
계좌 비활성화. *(ACC-005)* 실제로는 Auth `탈퇴` 이벤트를 수신한 Account 서비스가 수행하며, 여기서는
`status: "inactive"`로 바꾼 계좌를 합성 반환하는 모킹입니다. 비활성 계좌의 주문/체결/조회 차단(ACC-006)은
Account 서비스 내부에서 enforce됩니다.

**응답 `200`** — [`Account`](#account) (`status: "inactive"`)

> **출금 미지원 (ACC-007)**: 가상계좌이므로 출금 엔드포인트는 제공하지 않습니다(설계상 부재).

### `GET /api/account/watchlist`
관심종목 목록(시드 심볼을 시세로 resolve).

**응답 `200`** — [`Quote`](#quote)`[]`

### `POST /api/account/watchlist`
관심종목 추가.

**요청 본문** — [`AddWatchlistBody`](#addwatchlistbody) `{ "symbol": "005930" }`

**응답 `201`** — [`WatchlistItem`](#watchlistitem) · **`404`** — 알 수 없는 심볼

```json
{ "symbol": "005930", "name": "삼성전자", "addedAt": "2026-06-17T03:18:48.861Z" }
```

### `DELETE /api/account/watchlist/{symbol}`
관심종목 제거. **경로 파라미터**: `symbol` · **응답 `204`**

---

## Notification

### `GET /api/notifications`
알림 목록. 최신순 정렬.

**쿼리 파라미터** — [`NotificationListQuery`](#notificationlistquery)

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `limit` | integer (기본 `20`) | 최대 개수 |
| `offset` | integer (기본 `0`) | 페이지 오프셋 |
| `status` | [`NotificationStatus`](#enum-notificationstatus) | `unread`/`read` 필터 |

**응답 `200`** — [`Notification`](#notification)`[]`

```json
[
  {
    "id": "n1", "type": "surge", "title": "📈 삼성전자 급등",
    "body": "삼성전자가 전일 대비 5% 이상 상승했습니다.",
    "status": "unread", "triggeredAt": "2026-06-17T09:35:00+09:00",
    "meta": { "symbol": "005930", "changePercent": 5.2 }
  }
]
```

### `GET /api/notifications/unread-count`
읽지 않은 알림 수. 벨 아이콘 배지에 사용.

**응답 `200`** — [`UnreadCountResult`](#unreadcountresult)

```json
{ "count": 3 }
```

### `PATCH /api/notifications/{id}/read`
단건 읽음 처리. 이미 읽음 상태여도 204 반환(멱등).

**경로 파라미터**: `id` (string)

**응답 `204`** (본문 없음) · **`404`** — 미존재

### `PATCH /api/notifications/read-all`
전체 읽음 처리. unread 상태인 모든 알림을 read로 변경.

**응답 `204`** (본문 없음)

### `DELETE /api/notifications/{id}`
알림 삭제.

**경로 파라미터**: `id` (string)

**응답 `204`** (본문 없음) · **`404`** — 미존재

---

## Ranking

### `GET /api/rankings`
투자 랭킹(수익률 순).

**응답 `200`** — [`RankingEntry`](#rankingentry)`[]`

### `GET /api/rankings/me`
내 랭킹.

**응답 `200`** — [`RankingEntry`](#rankingentry) · **`404`** — 랭킹 없음

```json
{ "rank": 4, "userId": "u_demo", "username": "박유빈", "avatar": "🐯", "returnPercent": 18.36, "totalAsset": 118360000, "dayChangePercent": 0.6 }
```

---

## Mission

### `GET /api/missions`
미션/챌린지 목록.

**쿼리 파라미터** — [`MissionQuery`](#missionquery)

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `category` | [`MissionCategory`](#enum-missioncategory) | 카테고리 필터 |
| `status` | [`MissionStatus`](#enum-missionstatus) | 상태 필터 |

**응답 `200`** — [`Mission`](#mission)`[]`

```json
[ { "id": "m1", "category": "daily", "title": "오늘의 첫 거래", "description": "오늘 첫 번째 주식 매수를 완료하세요", "reward": 500, "progress": 1, "total": 1, "completed": true, "icon": "🎯" } ]
```

### `GET /api/missions/progress`
내 미션 진행 상태 요약. *(MISSION-008)*

**응답 `200`** — [`MissionProgressStatus`](#missionprogressstatus)

```json
{ "active": 3, "completed": 7, "totalPoints": 15500 }
```

### `GET /api/missions/challenges`
챌린지 목록(시즌 운영 정보 포함). *(MISSION-013)*

**응답 `200`** — [`Challenge`](#challenge)`[]`

### `GET /api/missions/challenges/{id}`
챌린지 상세. *(MISSION-014)*

**경로 파라미터**: `id` (string)

**응답 `200`** — [`Challenge`](#challenge) · **`404`** — 미존재

### `POST /api/missions/challenges/{id}/join`
챌린지 참여. *(MISSION-012)*

**경로 파라미터**: `id` (string)

**응답 `200`** — [`Challenge`](#challenge) (joined:true, participants 증가) · **`404`** — 미존재 · **`409`** — 종료된 챌린지

### `GET /api/missions/challenges/{id}/result`
챌린지 결과 조회. *(MISSION-014)* 참여한 챌린지만 조회 가능.

**경로 파라미터**: `id` (string)

**응답 `200`** — [`ChallengeResult`](#challengeresult) · **`404`** — 미존재 · **`409`** — 미참여

```json
{ "challenge": { "id": "c1", "..." : "..." }, "rank": 3, "returnPercent": 8.42, "rewardedPoints": 1000, "rewardedBadge": "🏆" }
```

### `GET /api/missions/{id}`
미션 상세. *(MISSION-005)*

**경로 파라미터**: `id` (string)

**응답 `200`** — [`Mission`](#mission) · **`404`** — 미존재

### `POST /api/missions/{id}/join`
미션 참여. *(MISSION-006)* 참여 시 `status`가 `in_progress`로 전환.

**경로 파라미터**: `id` (string)

**응답 `200`** — [`Mission`](#mission) · **`404`** — 미존재 · **`409`** — 이미 완료/실패 상태

### `DELETE /api/missions/{id}/participation`
미션 참여 취소. *(MISSION-007)* `in_progress` 상태만 취소 가능.

**경로 파라미터**: `id` (string)

**응답 `200`** — [`Mission`](#mission) (status: cancelled) · **`404`** — 미존재 · **`409`** — 비취소 가능 상태

### `POST /api/missions/{id}/claim`
미션 보상 수령. 완료된 미션만 수령 가능.

**경로 파라미터**: `id` (string)

**응답 `200`** — [`ClaimRewardResult`](#claimrewardresult) · **`404`** — 미존재 · **`409`** — 미완료/중복 수령

```json
{ "mission": { "id": "m1", "...": "...", "completed": true, "claimed": true }, "rewardedPoints": 500, "rewardedBadge": "🎯", "totalPoints": 15500 }
```

### `POST /api/missions/{id}/progress`
미션 진행도 갱신(mock 헬퍼). `amount`만큼 증가시켜 `completed` 재계산 후 합성 반환.

**경로 파라미터**: `id` (string)
**요청 본문** — [`MissionProgressBody`](#missionprogressbody) `{ "amount": 1 }` (기본 1)

**응답 `200`** — [`Mission`](#mission) · **`404`** — 미존재

---

### 관리자 전용

### `POST /api/missions/admin`
미션 생성. *(MISSION-001/019)* 관리자 전용.

**요청 본문** — [`UpsertMissionBody`](#upsertmissionbody)

**응답 `201`** — [`Mission`](#mission)

### `PUT /api/missions/admin/{id}`
미션 수정. *(MISSION-002/019)*

**경로 파라미터**: `id` (string)
**요청 본문** — [`UpsertMissionBody`](#upsertmissionbody)

**응답 `200`** — [`Mission`](#mission) · **`404`** — 미존재

### `DELETE /api/missions/admin/{id}`
미션 삭제. *(MISSION-003)*

**경로 파라미터**: `id` (string)

**응답 `204`** (본문 없음) · **`404`** — 미존재

### `GET /api/missions/admin/{id}/participants`
미션 참여자 조회. *(MISSION-018)*

**경로 파라미터**: `id` (string)

**응답 `200`** — [`MissionParticipant`](#missionparticipant)`[]` · **`404`** — 미존재

### `GET /api/missions/admin/{id}/stats`
미션 통계 조회. *(MISSION-020)*

**경로 파라미터**: `id` (string)

**응답 `200`** — [`MissionStats`](#missionstats) · **`404`** — 미존재

```json
{ "missionId": "m1", "participants": 42, "completed": 28, "failed": 5, "completionRate": 67, "totalRewardedPoints": 14000 }
```

### `POST /api/missions/challenges/admin`
챌린지 생성. *(MISSION-011)*

**요청 본문** — [`UpsertChallengeBody`](#upsertchallengebody)

**응답 `201`** — [`Challenge`](#challenge)

---

## Learn

### `GET /api/learn`
학습 콘텐츠 목록. `published: true`인 콘텐츠만 반환.

**쿼리 파라미터** — [`LearnQuery`](#learnquery)

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `level` | [`LearnLevel`](#enum-learnlevel) | 난이도 필터 |
| `category` | string | 카테고리 필터 |
| `favorite` | boolean | 즐겨찾기만 |
| `q` | string | 제목/설명/키워드 검색 |

**응답 `200`** — [`LearnContent`](#learncontent)`[]`

### `GET /api/learn/progress`
내 학습 진도율 요약. *(LEARN-010)*

**응답 `200`** — [`LearnProgressSummary`](#learnprogresssummary)

```json
{ "total": 9, "completed": 4, "inProgress": 2, "completionRate": 44 }
```

### `GET /api/learn/favorites`
즐겨찾기 콘텐츠 목록. *(LEARN-012)*

**응답 `200`** — [`LearnContent`](#learncontent)`[]`

### `GET /api/learn/recommended`
학습 기록 기반 추천 콘텐츠. *(LEARN-013)* 완료한 카테고리의 미완료 콘텐츠를 우선 추천, 최대 4개.

**응답 `200`** — [`LearnContent`](#learncontent)`[]`

### `GET /api/learn/{id}`
학습 콘텐츠 상세. 조회 시 `readCount`를 1 증가.

**경로 파라미터**: `id` (string) — 예: `l1`

**응답 `200`** — [`LearnContent`](#learncontent) · **`404`** — 알 수 없는 콘텐츠

```json
{ "id": "l1", "title": "캔들스틱 차트 읽는 법", "description": "양봉과 음봉의 의미, 패턴 해석 방법을 배워보세요", "category": "기술적분석", "level": "beginner", "duration": "5분", "readCount": 12840, "emoji": "🕯️" }
```

### `POST /api/learn/{id}/complete`
학습 콘텐츠 완독 처리.

**경로 파라미터**: `id` (string)

**응답 `200`** — [`LearnProgressResult`](#learnprogressresult) · **`404`** — 미존재

```json
{ "content": { "id": "l1", "...": "...", "completed": true }, "completed": true, "completedAt": "2026-06-17T03:18:48.861Z" }
```

### `POST /api/learn/{id}/favorite`
즐겨찾기 등록/해제 토글. *(LEARN-011)*

**경로 파라미터**: `id` (string)

**응답 `200`** — [`LearnFavoriteResult`](#learnfavoriteresult) · **`404`** — 미존재

```json
{ "content": { "id": "l1", "...": "...", "favorite": true }, "favorite": true }
```

---

## 데이터 모델

모든 모델은 [`@candle/shared`](../shared/src)에 TypeBox 스키마로 정의되어 있습니다.

### 공통 / Enums

#### enum `Exchange`
`"KOSPI"` \| `"KOSDAQ"` \| `"NYSE"` \| `"NASDAQ"`

#### enum `Currency`
`"KRW"` \| `"USD"`

#### enum `AccountStatus`
`"active"` \| `"inactive"`

#### enum `OrderKind`
`"market"`(시장가) \| `"limit"`(지정가) *(ORD-002/003)*

#### enum `MarketSession`
`"regular"`(정규장) \| `"closed"`(마감) *(ORD-012)*

#### enum `OAuthProvider`
`"google"` \| `"kakao"` \| `"naver"` *(AUTH-003)*

#### enum `UserRole`
`"USER"` \| `"ADMIN"` *(AUTH-011)*

#### enum `UserStatus`
`"active"` \| `"suspended"` \| `"withdrawn"` *(AUTH-014 — 비활성이면 로그인 403)*

#### enum `CandleInterval`
`"1d"`(일) \| `"1w"`(주) \| `"1M"`(월)

#### enum `TransactionType`
`"buy"` \| `"sell"`

#### enum `TransactionStatus`
`"filled"` \| `"pending"` \| `"cancelled"`

#### enum `MissionCategory`
`"daily"` \| `"weekly"` \| `"special"`

#### enum `MissionStatus`
`"available"` \| `"in_progress"` \| `"completed"` \| `"failed"` \| `"cancelled"` \| `"expired"`

#### enum `NotificationType`
`"surge"` \| `"crash"` \| `"market_open"` \| `"market_close"` \| `"order_executed"` \| `"mission_complete"`
확장 가능 — 신규 타입 추가 시 `meta` 필드로 타입별 데이터를 실어 하위 호환성 유지.

#### enum `NotificationStatus`
`"unread"` \| `"read"`

#### enum `LearnLevel`
`"beginner"` \| `"intermediate"` \| `"advanced"`

#### enum `InvestStyle`
`"conservative"` \| `"balanced"` \| `"aggressive"` \| `"momentum"`

---

### Market

#### `Quote`
단일 종목의 실시간성 시세.

| 필드 | 타입 | 설명 |
|---|---|---|
| `symbol` | string | 종목코드 (예: `005930`, `AAPL`) |
| `name` | string | 종목명 |
| `exchange` | [`Exchange`](#enum-exchange) | 거래소 |
| `currency` | [`Currency`](#enum-currency) | 통화 |
| `sector` | string | 섹터 |
| `price` | number | 현재가(최종 체결가) |
| `change` | number | 전일 대비 변동액 |
| `changePercent` | number | 전일 대비 변동률(%) |
| `prevClose` | number | 전일 종가 |
| `open` | number | 시가 |
| `high` | number | 고가 |
| `low` | number | 저가 |
| `volume` | number | 당일 거래량(주) |
| `marketCap` | number | 시가총액(상장 통화 기준) |
| `updatedAt` | string(date-time) | 갱신 시각 |

#### `Candle`
OHLCV 캔들. `date`는 일봉이면 `YYYY-MM-DD`, 분/시 단위면 ISO datetime.

| 필드 | 타입 | 설명 |
|---|---|---|
| `date` | string | 기준 일자 |
| `open` | number | 시가 |
| `high` | number | 고가 |
| `low` | number | 저가 |
| `close` | number | 종가 |
| `volume` | number | 거래량 |

#### `StockFinancials`
| 필드 | 타입 | 설명 |
|---|---|---|
| `revenue` | number | 매출액 |
| `operatingProfit` | number | 영업이익 |
| `netIncome` | number | 순이익 |
| `per` | number | PER |
| `pbr` | number | PBR |
| `roe` | number | ROE(%) |

#### `StockDetail`
[`Quote`](#quote)의 모든 필드 + 아래.

| 필드 | 타입 | 설명 |
|---|---|---|
| `high52w` | number | 52주 최고가 |
| `low52w` | number | 52주 최저가 |
| `description` | string | 기업 개요 |
| `financials` | [`StockFinancials`](#stockfinancials) | 재무 요약 |

#### `NewsItem`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 식별자 |
| `symbol` | string? | 관련 종목코드 |
| `title` | string | 제목 |
| `source` | string | 출처 |
| `publishedAt` | string(date-time) | 게시 시각 |
| `url` | string? | 원문 링크 |

#### `MarketMovers`
| 필드 | 타입 | 설명 |
|---|---|---|
| `gainers` | [`Quote`](#quote)`[]` | 상승 상위 |
| `losers` | [`Quote`](#quote)`[]` | 하락 상위 |
| `mostActive` | [`Quote`](#quote)`[]` | 거래량 상위 |

---

### Account

#### `Account`
가상 거래 계좌 요약(대시보드 카드 데이터).

| 필드 | 타입 | 설명 |
|---|---|---|
| `accountId` | string | 계좌 ID |
| `userId` | string | 사용자 ID |
| `status` | [`AccountStatus`](#enum-accountstatus) | 계좌 상태(활성/비활성) |
| `currency` | [`Currency`](#enum-currency) | 기준 통화 |
| `cash` | number | 가용 가능 금액(주문 가능 현금) |
| `lockedAmount` | number | 묶인 금액(미체결 주문 등) |
| `totalAsset` | number | 총 자산(평가금액 + 현금) |
| `investedAmount` | number | 주식 평가금액(현금 제외) |
| `totalProfitLoss` | number | 총 손익 |
| `totalReturnPercent` | number | 총 수익률(%) |
| `todayProfitLoss` | number | 오늘 손익 |
| `todayReturnPercent` | number | 오늘 수익률(%) |
| `rank` | number | 현재 랭킹 |
| `updatedAt` | string(date-time) | 갱신 시각 |

#### `AccountBalance`
잔고를 총/묶인/가용으로 분리한 뷰 (ACC-004).
| 필드 | 타입 | 설명 |
|---|---|---|
| `totalBalance` | number | 총 잔고(가용 + 묶인) |
| `lockedAmount` | number | 묶인 금액 |
| `availableAmount` | number | 가용 가능 금액 |

#### `Holding`
| 필드 | 타입 | 설명 |
|---|---|---|
| `symbol` | string | 종목코드 |
| `name` | string | 종목명 |
| `sector` | string | 섹터 |
| `quantity` | number | 보유 수량 |
| `avgPrice` | number | 평균 매입 단가 |
| `currentPrice` | number | 현재가 |
| `costBasis` | number | 매입 금액(`quantity * avgPrice`) |
| `totalValue` | number | 평가 금액(`quantity * currentPrice`) |
| `profitLoss` | number | 평가 손익 |
| `profitLossPercent` | number | 평가 손익률(%) |

#### `Transaction` (= 주문/체결)
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 주문/거래 ID |
| `type` | [`TransactionType`](#enum-transactiontype) | 매수/매도 |
| `orderKind` | [`OrderKind`](#enum-orderkind)? | 시장가/지정가 |
| `symbol` | string | 종목코드 |
| `name` | string | 종목명 |
| `quantity` | number | 수량 |
| `price` | number | 체결/지정 단가 |
| `amount` | number | 체결 금액(`quantity * price`) |
| `fee` | number | 수수료 |
| `status` | [`TransactionStatus`](#enum-transactionstatus) | 상태(filled/pending/cancelled) |
| `executedAt` | string(date-time) | 체결/접수 시각 |

#### `MarketStatus`
장 운영 상태 (ORD-012).
| 필드 | 타입 | 설명 |
|---|---|---|
| `open` | boolean | 정규장 여부 |
| `session` | [`MarketSession`](#enum-marketsession) | regular/closed |
| `asOf` | string(date-time) | 기준 시각 |
| `message` | string? | 마감 안내 문구 |

#### `PortfolioPoint`
| 필드 | 타입 | 설명 |
|---|---|---|
| `date` | string | 일자 |
| `value` | number | 해당 시점 총 평가 자산 |

#### `SectorAllocation`
| 필드 | 타입 | 설명 |
|---|---|---|
| `sector` | string | 섹터명 |
| `value` | number | 평가 금액 |
| `percent` | number | 비중(%) |

#### `OrderCancelResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 취소된 주문 ID |
| `status` | `"cancelled"` | 고정값 |
| `cancelledAt` | string(date-time) | 취소 시각 |

#### `WatchlistItem`
| 필드 | 타입 | 설명 |
|---|---|---|
| `symbol` | string | 종목코드 |
| `name` | string | 종목명 |
| `addedAt` | string(date-time) | 추가 시각 |

---

### Social

#### `RankingEntry`
| 필드 | 타입 | 설명 |
|---|---|---|
| `rank` | number | 순위 |
| `userId` | string | 사용자 ID |
| `username` | string | 닉네임 |
| `avatar` | string | 아바타(이모지) |
| `returnPercent` | number | 수익률(%) |
| `totalAsset` | number | 총 자산 |
| `dayChangePercent` | number | 전일 대비 수익률 변화(%p) |
| `badge` | string? | 뱃지 |

#### `Mission`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 미션 ID |
| `category` | [`MissionCategory`](#enum-missioncategory) | 분류 |
| `title` | string | 제목 |
| `description` | string | 설명 |
| `reward` | number | 보상 포인트 |
| `progress` | number | 현재 진행도 |
| `total` | number | 목표치 |
| `completed` | boolean | 완료 여부 |
| `claimed` | boolean? | 보상 수령 여부 |
| `icon` | string | 아이콘(이모지) |

#### `ClaimRewardResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `mission` | [`Mission`](#mission) | 수령 처리된 미션(`claimed: true`) |
| `rewardedPoints` | number | 이번에 수령한 포인트 |
| `totalPoints` | number | 수령 후 누적 포인트 |

#### `LearnProgressResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `content` | [`LearnContent`](#learncontent) | 완독 처리된 콘텐츠(readCount+1) |
| `completed` | boolean | 완료 여부 |
| `completedAt` | string(date-time) | 완료 시각 |

#### `LearnContent`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 콘텐츠 ID |
| `title` | string | 제목 |
| `description` | string | 설명 |
| `category` | string | 카테고리 |
| `level` | [`LearnLevel`](#enum-learnlevel) | 난이도 |
| `duration` | string | 예상 소요(예: `5분`) |
| `readCount` | number | 조회 수 |
| `emoji` | string | 대표 이모지 |

---

### User

#### `UserProfile`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 사용자 ID |
| `username` | string | 닉네임 |
| `email` | string(email) | 이메일 |
| `avatar` | string | 아바타(이모지) |
| `role` | [`UserRole`](#enum-userrole) | 권한(USER/ADMIN) |
| `status` | [`UserStatus`](#enum-userstatus) | 계정 상태 |
| `provider` | [`OAuthProvider`](#enum-oauthprovider)? | 가입 OAuth 제공자 |
| `investStyle` | [`InvestStyle`](#enum-investstyle)? | 투자 성향 |
| `createdAt` | string(date-time) | 가입 시각 |

#### `AuthTokens`
Access/Refresh 토큰 쌍 (AUTH-005/006).
| 필드 | 타입 | 설명 |
|---|---|---|
| `accessToken` | string | JWT Access Token(mock) |
| `refreshToken` | string | Refresh Token(mock) |
| `tokenType` | `"Bearer"` | 고정값 |
| `expiresIn` | number | Access 만료(초) |
| `refreshExpiresIn` | number | Refresh 만료(초) |

#### `ProviderInfo`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | [`OAuthProvider`](#enum-oauthprovider) | 제공자 ID |
| `name` | string | 표시명 |
| `color` | string | 버튼 브랜드 컬러 |

#### `OAuthLoginResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `tokens` | [`AuthTokens`](#authtokens) | 발급 토큰 |
| `user` | [`UserProfile`](#userprofile) | 사용자 |
| `isNewUser` | boolean | 자동 회원가입 여부(AUTH-002/004) |

#### `RefreshTokenResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `accessToken` | string | 재발급 Access Token |
| `tokenType` | `"Bearer"` | 고정값 |
| `expiresIn` | number | 만료(초) |

#### `TokenValidateResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `valid` | boolean | 유효 여부 |
| `role` | [`UserRole`](#enum-userrole)? | 토큰 클레임의 권한 |
| `expiresAt` | string(date-time)? | 만료 시각 |

#### `AuthResponse` *(legacy)*
| 필드 | 타입 | 설명 |
|---|---|---|
| `token` | string | Bearer 토큰(현재 mock) |
| `user` | [`UserProfile`](#userprofile) | 사용자 정보 |

#### `NicknameCheckResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `nickname` | string | 검사한 닉네임 |
| `available` | boolean | 사용 가능 여부 |

#### `MyPageSummary`
마이페이지 집계 (USER-012~016).
| 필드 | 타입 | 설명 |
|---|---|---|
| `profile` | [`UserProfile`](#userprofile) | 기본 프로필(이메일·가입일 포함) |
| `performance` | `{ totalReturnPercent, totalProfitLoss }` | 누적 수익률(USER-013) |
| `assets` | `{ totalAsset, cash, investedAmount }` | 자산 현황(USER-014) |
| `ranking` | `{ rank, returnPercent }`? | 랭킹(USER-015, 없을 수 있음) |
| `challenges` | `{ active, completed }` | 챌린지 현황(USER-016) |

---

### 요청 스키마

#### `SignupBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `username` | string | 2–20자 |
| `email` | string(email) | — |
| `password` | string | 최소 8자 |

#### `LoginBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `email` | string(email) | — |
| `password` | string | 최소 1자 |

#### `OAuthLoginQuery`
목 전용 시나리오 셀렉터.
| 필드 | 타입 | 제약 |
|---|---|---|
| `as` | `'existing' \| 'new' \| 'suspended' \| 'withdrawn'`? | 기본 `existing`. `suspended`/`withdrawn`은 403 |

#### `NicknameCheckQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `nickname` | string | 2–20자 |

#### `RefreshTokenBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `refreshToken` | string | 필수 |

#### `TokenValidateBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `token` | string | 필수 |

#### `LogoutBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `refreshToken` | string? | 폐기할 토큰(선택) |

#### `UpdateProfileBody`
모든 필드 선택(전달한 것만 수정).
| 필드 | 타입 | 제약 |
|---|---|---|
| `username` | string? | 2–20자 |
| `avatar` | string? | — |
| `investStyle` | [`InvestStyle`](#enum-investstyle)? | — |

#### `StockListQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `q` | string? | 이름/코드 검색 |
| `exchange` | [`Exchange`](#enum-exchange)? | — |
| `sector` | string? | — |
| `limit` | integer? | 1–100 |

#### `CandleQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `interval` | [`CandleInterval`](#enum-candleinterval)? | 기본 `1d` |
| `limit` | integer? | 1–365, 기본 60 |

#### `PlaceOrderBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `symbol` | string | — |
| `type` | [`TransactionType`](#enum-transactiontype) | 매수/매도 |
| `orderKind` | [`OrderKind`](#enum-orderkind)? | 기본 `market` (ORD-002/003) |
| `quantity` | integer | 최소 1, 1주 단위 (ORD-010) |
| `price` | number? | 지정가 시 필수·정수 (ORD-011). market이면 무시 |

#### `OrderListQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `status` | [`TransactionStatus`](#enum-transactionstatus)? | filled/pending/cancelled |
| `symbol` | string? | 종목 필터 |

#### `PortfolioHistoryQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `days` | integer? | 1–365, 기본 30 |

#### `TransactionQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `limit` | integer? | 1–100 |
| `type` | [`TransactionType`](#enum-transactiontype)? | — |

#### `MissionQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `category` | [`MissionCategory`](#enum-missioncategory)? | — |

#### `MissionProgressBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `amount` | integer? | 최소 1, 기본 1 |

#### `AddWatchlistBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `symbol` | string | — |

#### `LearnQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `level` | [`LearnLevel`](#enum-learnlevel)? | — |
| `category` | string? | — |
| `favorite` | boolean? | — |
| `q` | string? | 전문 검색 |

---

### Notification

#### `Notification`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 알림 ID |
| `type` | [`NotificationType`](#enum-notificationtype) | 알림 종류 |
| `title` | string | 제목 |
| `body` | string | 본문 |
| `status` | [`NotificationStatus`](#enum-notificationstatus) | 읽음 상태 |
| `triggeredAt` | string(date-time) | 발생 시각 |
| `meta` | `Record<string, unknown>` | 타입별 추가 데이터(선택) |

#### `UnreadCountResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `count` | integer | 읽지 않은 알림 수 |

#### `NotificationListQuery`
| 필드 | 타입 | 제약 |
|---|---|---|
| `limit` | integer? | 기본 20 |
| `offset` | integer? | 기본 0 |
| `status` | [`NotificationStatus`](#enum-notificationstatus)? | — |

#### `NotificationIdParams`
| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | string | — |

---

### 추가 Request Bodies

#### `AmendOrderBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `quantity` | integer | ≥ 1 |
| `price` | integer | 지정가(정수) |

#### `CreateReservationBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `symbol` | string | — |
| `type` | `buy`\|`sell` | — |
| `timing` | `open`\|`close`\|`prev_close` | — |
| `orderKind` | [`OrderKind`](#enum-orderkind) | — |
| `quantity` | integer | ≥ 1 |
| `price` | integer? | 지정가일 때 필수 |
| `scheduledDate` | string? | `close`/`prev_close`일 때 필수, YYYY-MM-DD |

#### `AmendReservationBody`
| 필드 | 타입 | 제약 |
|---|---|---|
| `timing` | `open`\|`close`\|`prev_close`? | — |
| `orderKind` | [`OrderKind`](#enum-orderkind)? | — |
| `quantity` | integer? | ≥ 1 |
| `price` | integer? | — |
| `scheduledDate` | string? | — |

---

### 추가 Response Types

#### `IntradayHistory`
| 필드 | 타입 | 설명 |
|---|---|---|
| `symbol` | string | 종목코드 |
| `ticks` | `{ time: string; price: number; volume: number }[]` | 당일 분봉 틱 배열 |

#### `Reservation`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 예약 ID |
| `symbol` | string | 종목코드 |
| `name` | string | 종목명 |
| `type` | `buy`\|`sell` | 매수/매도 |
| `timing` | `open`\|`close`\|`prev_close` | 체결 시점 |
| `orderKind` | [`OrderKind`](#enum-orderkind) | 주문 종류 |
| `quantity` | integer | 수량 |
| `price` | number? | 지정가(지정가일 때만) |
| `scheduledDate` | string | 실행 예정일(YYYY-MM-DD) |
| `amount` | number | 예상 체결 금액 |
| `fee` | number | 예상 수수료 |
| `status` | `reserved`\|`executed`\|`cancelled`\|`failed` | 예약 상태 |
| `parentOrderId` | string? | 정정 원예약 ID |
| `createdAt` | string(date-time) | 생성 시각 |

#### `MissionProgressStatus`
| 필드 | 타입 | 설명 |
|---|---|---|
| `active` | integer | 진행 중 미션 수 |
| `completed` | integer | 완료 미션 수 |
| `totalPoints` | integer | 누적 포인트 |

#### `MissionParticipant`
| 필드 | 타입 | 설명 |
|---|---|---|
| `userId` | string | — |
| `username` | string | — |
| `missionId` | string | — |
| `status` | [`MissionStatus`](#enum-missionstatus) | — |
| `progress` | number | — |
| `joinedAt` | string(date-time) | — |

#### `MissionStats`
| 필드 | 타입 | 설명 |
|---|---|---|
| `missionId` | string | — |
| `participants` | integer | 총 참여자 수 |
| `completed` | integer | 완료 수 |
| `failed` | integer | 실패 수 |
| `completionRate` | integer | 완료율(%) |
| `totalRewardedPoints` | integer | 지급된 총 포인트 |

#### `LearnProgressSummary`
| 필드 | 타입 | 설명 |
|---|---|---|
| `total` | integer | 전체 콘텐츠 수 |
| `completed` | integer | 완료 수 |
| `inProgress` | integer | 진행 중 수 |
| `completionRate` | integer | 완료율(%) |

#### `LearnFavoriteResult`
| 필드 | 타입 | 설명 |
|---|---|---|
| `content` | [`LearnContent`](#learncontent) | 업데이트된 콘텐츠 |
| `favorite` | boolean | 현재 즐겨찾기 상태 |

---

## 부록 — 알려진 데모 종목

`mock` 데이터 소스에서 사용 가능한 종목코드(웹앱 정적 생성 대상과 동일):

`005930`(삼성전자), `000660`(SK하이닉스), `373220`(LG에너지솔루션), `005380`(현대차),
`035420`(NAVER), `035720`(카카오), `068270`(셀트리온), `207940`(삼성바이오로직스),
`006400`(삼성SDI), `051910`(LG화학), `091990`(셀트리온헬스케어), `247540`(에코프로비엠),
`AAPL`(애플), `TSLA`(테슬라), `NVDA`(엔비디아), `MSFT`(마이크로소프트)
