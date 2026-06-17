# Candle BFF - 마이크로서비스 gRPC 연동 명세

이 문서는 BFF가 프론트 REST API를 제공하기 위해 내부 마이크로서비스를 어떤 형태로 호출해야 하는지 정의한다.
외부 클라이언트 계약은 `bff/API.md`와 `shared/src/*` TypeBox 스키마가 기준이며, 이 문서는 마이크로서비스 팀이 구현할 내부 gRPC 계약, BFF 조합 규칙, Outbox/CDC 이벤트 책임 경계를 설명한다.

Java Spring Boot 환경의 구현 예시는 [Java gRPC 구현 가이드](./GRPC_IMPLEMENTATION_JAVA.md)를 참고한다.

현재 BFF는 목 데이터로 화면 DTO를 합성한다. 실제 전환 시 BFF는 아래 gRPC 호출을 병렬/순차 조합해 동일한 REST 응답을 만들어야 한다.

---

## 1. 아키텍처

### 1.1 경계

```text
웹 / Capacitor 앱
        |
        | REST JSON
        v
BFF
        |
        | gRPC + 메타데이터(user_id, request_id, idempotency_key)
        v
도메인 마이크로서비스
        |
        | DB 트랜잭션 + Outbox
        v
CDC / 메시지 브로커 / 조회용 프로젝션
```

BFF 책임:

- 프론트 전용 REST DTO 조립
- 인증 토큰 검증 결과에서 `user_id`, `role` 추출
- 읽기 API 병렬 호출
- 도메인별 제한 시간, 재시도, 대체 응답 정책 적용
- gRPC 에러를 REST 에러 봉투로 변환
- 화면 편의 필드 계산: label, joined, claimed, availableBalance 등 조합 필드

마이크로서비스 책임:

- 도메인 정합성 검증
- DB 트랜잭션 처리
- 금액/수량/상태 전이의 단일 소유권
- Outbox 이벤트 기록
- CDC 또는 outbox 발행기를 통한 이벤트 발행
- 멱등성 처리

BFF 금지 사항:

- 잔고 차감/반환을 직접 계산해 커밋하지 않는다.
- 주문 체결, 예약 실행, 보상 지급 같은 정합성 작업을 여러 서비스에 걸쳐 직접 트랜잭션처럼 묶지 않는다.
- 다른 서비스 DB를 직접 읽지 않는다.
- CDC 프로젝션을 원천 데이터처럼 수정하지 않는다.

### 1.2 읽기와 쓰기

읽기 API:

- 가능한 병렬 gRPC 호출을 사용한다.
- 각 서비스 원천 데이터를 BFF에서 화면 DTO로 병합한다.
- 일부 부가 데이터 실패 시 제한된 대체 응답을 허용할 수 있다.

쓰기 API:

- BFF는 명령을 단일 소유 서비스로 보낸다.
- 소유 서비스가 DB 트랜잭션 안에서 상태 변경과 outbox 기록을 함께 수행한다.
- 다른 도메인 경계에 대한 반영은 이벤트/CDC로 처리한다.
- BFF는 명령 결과 또는 접수 상태만 반환한다.

예시:

```text
POST /api/account/orders/{id}/cancel
  BFF -> OrderService.CancelOrder

OrderService 트랜잭션:
  1. 주문 잠금
  2. 취소 가능 여부 검증
  3. 주문 상태를 CANCELLED로 변경
  4. outbox에 OrderCancelled 기록

CDC/outbox 발행기:
  OrderCancelled -> AccountService가 예약 잔고 반환
  OrderCancelled -> NotificationService가 필요 시 push 발송
```

잔고 반환이 즉시 화면에 보여야 하는 API는 두 가지 방식 중 하나를 명세해야 한다.

- 강한 명령 방식: `OrderService.CancelOrder`가 계좌 원장과 같은 서비스 경계 안에 있거나, 내부적으로 동기 AccountService 명령까지 완료한 뒤 성공 반환한다.
- 최종적 일관성 방식: `CancelOrder`는 주문 취소 확정만 반환하고, BFF는 `balanceUpdateStatus = PENDING` 같은 필드를 내려준다. 프론트는 재조회 또는 push/SSE로 최신 잔고를 받는다.

현재 요구사항 `CAN-004`는 "즉시 감소"이므로 운영 설계에서는 Order/Account 정합성 경계를 강하게 잡아야 한다. 단, 구현 방식은 분산 트랜잭션이 아니라 소유 서비스 트랜잭션 + outbox/CDC로 일관된 원장 프로젝션을 만드는 방향을 권장한다.

---

## 2. 공통 gRPC 규칙

### 2.1 메타데이터

모든 BFF -> 서비스 호출에는 아래 메타데이터를 포함한다.

| 키 | 필수 여부 | 설명 |
|---|---:|---|
| `x-user-id` | 사용자 API 필수 | 인증된 사용자 ID |
| `x-role` | 필수 | `USER`, `ADMIN` |
| `x-request-id` | 필수 | BFF 요청 추적 ID |
| `x-idempotency-key` | 쓰기 API 필수 | 중복 명령 방지 |
| `x-client-platform` | 선택 | `web`, `ios`, `android`, `capacitor` |
| `x-timezone` | 선택 | 기본 `Asia/Seoul` |

### 2.2 시간과 금액

- 모든 서비스 간 timestamp는 `google.protobuf.Timestamp` 사용.
- 화면 표시 날짜는 BFF에서 `Asia/Seoul` 기준으로 변환한다.
- 금액은 부동소수점 사용 금지. `int64` 최소 화폐 단위를 사용한다.
  - KRW는 원 단위라 `amount_krw = 1000`은 1,000원.
  - 해외 주식/환전이 들어가면 `Money { currency, units, nanos }` 또는 decimal string을 별도 도입한다.
- 수량은 현재 주식 수량이 정수이면 `int64 quantity`. 소수점 거래를 지원하면 decimal string으로 확장한다.

### 2.3 에러 매핑

| gRPC 코드 | REST 상태 | 용도 |
|---|---:|---|
| `INVALID_ARGUMENT` | 400 | 형식/범위 오류 |
| `UNAUTHENTICATED` | 401 | 인증 실패 |
| `PERMISSION_DENIED` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `ALREADY_EXISTS` | 409 | 중복 생성 |
| `FAILED_PRECONDITION` | 409 | 상태상 불가능 |
| `ABORTED` | 409 | 낙관적 잠금/버전 충돌 |
| `RESOURCE_EXHAUSTED` | 429 | 요청 한도 초과 |
| `UNAVAILABLE` | 503 | 의존 서비스 사용 불가 |
| `DEADLINE_EXCEEDED` | 504 | 제한 시간 초과 |

권장 에러 상세:

```proto
message ErrorDetail {
  string code = 1;              // 예: ORDER_NOT_CANCELLABLE
  string message = 2;           // 클라이언트에 노출 가능한 메시지
  map<string, string> fields = 3;
  bool retryable = 4;
}
```

### 2.4 제한 시간 정책

| 호출 유형 | 기본 제한 시간 | 재시도 |
|---|---:|---|
| 단일 서비스 읽기 | 300ms | 멱등 호출이면 1회 재시도 |
| 집계 읽기 병렬 호출 | 총 500ms | 보조 요청 선택 |
| 쓰기 명령 | 1,000ms | 멱등성 키가 없으면 자동 재시도 금지 |
| 관리자 대량/리포트 | 2,000ms | 자동 재시도 금지 |

쓰기 재시도 규칙:

- BFF는 `idempotency_key`가 있고 서비스 계약이 멱등 결과를 보장할 때만 재시도할 수 있다.
- 서비스는 명령 API에서 멱등성 키, 요청 해시, 최종 응답 스냅샷을 저장해야 한다.

---

## 3. 서비스 소유권

| 서비스 | 소유 범위 | 소유하지 않는 범위 |
|---|---|---|
| AuthService | OAuth 로그인, 토큰 발급/재발급/검증, 세션 폐기 | 인증 클레임을 넘어서는 상세 프로필 |
| UserService | 사용자 프로필, 닉네임, 탈퇴 상태 | 계좌 잔고, 주문 |
| MarketService | 종목 마스터, 시세, 캔들, 뉴스, 장 상태 | 사용자 보유종목 |
| AccountService | 현금 원장, 예약 잔고, 계좌 생명주기, 포트폴리오 조회 모델 | 주문 체결 판단 |
| OrderService | 즉시/지정가 주문 생명주기, 취소/정정 규칙 | 현재가 원천 |
| ReservationService | 예약 주문 생명주기, 예약 가능 시간창 | 실제 시장 가격 원천 |
| HoldingService | 보유종목, 실현/미실현 손익 조회 모델 | 주문 접수 판단 |
| LearningService | 콘텐츠, 카테고리, 사용자 학습 진도, 즐겨찾기 | 보상 지급 |
| MissionService | 미션/챌린지 카탈로그, 참여, 진행 상태 | 포인트 원장 |
| RewardService | 보상 지급, 뱃지, 업적, 보상 수령 멱등성 | 미션 조건 평가 |
| RankingService | 랭킹 조회 모델 | 계좌 원장 |
| NotificationService | push 토큰, push 발송 | 알림 발송 여부에 대한 비즈니스 판단 |

Order/Account/Holding 경계는 구현팀이 반드시 합의해야 한다. 돈/수량 정합성을 위해 아래 중 하나로 고정한다.

선택지 A - TradingService가 트랜잭션 경계를 소유:

- TradingService 안에 주문, 예약 잔고, 보유종목 업데이트 원장을 함께 둔다.
- 외부로 `OrderPlaced`, `OrderFilled`, `OrderCancelled` 이벤트를 발행한다.
- BFF는 TradingService에만 명령을 호출한다.

선택지 B - 서비스를 분리하고 outbox/최종적 일관성으로 연결:

- OrderService가 주문 상태를 소유한다.
- AccountService가 잔고 원장을 소유한다.
- HoldingService가 보유종목 프로젝션을 소유한다.
- 정합성은 outbox 이벤트 + 소비자 멱등성 + 보상 이벤트로 관리한다.
- "즉시" 요구사항은 명령 완료 전에 AccountService 동기 명령을 호출하거나, Account 프로젝션이 업데이트된 뒤 반환하는 조율 계층이 필요하다.

현재 요구사항 수준에서는 선택지 A 또는 "Order 명령 facade(외부에 단일 명령처럼 보이게 하는 진입점)"를 권장한다. 팀 내부 구현이 여러 서비스여도 BFF 입장에서는 `OrderCommandService` 단일 명령으로 보이게 한다.

---

## 4. BFF 엔드포인트별 gRPC 조합

### 4.1 인증/사용자

| BFF 엔드포인트 | gRPC 호출 | 방식 | 비고 |
|---|---|---|---|
| `GET /api/auth/providers` | `AuthService.ListProviders` | 단일 호출 | 공개 API |
| `POST /api/auth/oauth/{provider}` | `AuthService.OAuthLogin` | 단일 명령 | AuthService 내부에서 사용자 생성을 조율 |
| `POST /api/auth/token/refresh` | `AuthService.RefreshToken` | 단일 명령 | Refresh Token 회전 정책 기준으로 멱등 처리 |
| `POST /api/auth/logout` | `AuthService.Logout` | 단일 명령 | Refresh Token 폐기 |
| `GET /api/auth/me` | `UserService.GetMe` | 단일 호출 | 메타데이터의 사용자 ID 기준 |
| `PATCH /api/auth/me` | `UserService.UpdateProfile` | 단일 명령 | `UserProfileUpdated` 발행 |
| `GET /api/users/me/summary` | User, Account, Mission, Learning, Ranking | 병렬 호출 | BFF가 요약 응답 조립 |

### 4.2 시장

| BFF 엔드포인트 | gRPC 호출 | 방식 | 비고 |
|---|---|---|---|
| `GET /api/market/status` | `MarketService.GetMarketStatus` | 단일 호출 | KST 장 운영 캘린더 |
| `GET /api/market/stocks` | `MarketService.SearchStocks` | 단일 호출 | 검색어/시장 필터 지원 |
| `GET /api/market/movers` | `MarketService.GetMovers` | 단일 또는 병렬 호출 | 상승/하락/거래량 상위 |
| `GET /api/market/stocks/{symbol}` | `MarketService.GetStock`, `WatchlistService.IsWatched` | 병렬 호출 | 관심종목 여부는 선택 필드 |
| `GET /api/market/stocks/{symbol}/candles` | `MarketService.GetCandles` | 단일 호출 | |
| `GET /api/market/stocks/{symbol}/news` | `MarketService.GetNews` | 단일 호출 | 실패 시 빈 목록 대체 가능 |

### 4.3 계좌/주문/보유종목/예약

| BFF 엔드포인트 | gRPC 호출 | 방식 | 비고 |
|---|---|---|---|
| `GET /api/account` | Account, Holding, Ranking, Portfolio | 병렬 호출 | 대시보드 요약 |
| `GET /api/account/balance` | `AccountService.GetBalance` | 단일 호출 | 현금/예약/가용 잔고의 원천 |
| `GET /api/account/locked` | `OrderQueryService.ListLockedOrders` | 단일 호출 | 대기 중인 지정가 주문 |
| `GET /api/account/holdings` | `HoldingService.ListHoldings`, `MarketService.BatchQuotes` | 병렬 호출 후 병합 | 시세 기준 미실현손익 |
| `GET /api/account/holdings/{symbol}` | `HoldingService.GetHolding`, `MarketService.GetQuote` | 병렬 호출 | 보유종목이 없으면 404 |
| `GET /api/account/orders` | `OrderQueryService.ListOrders` | 단일 호출 | reserved/pending/filled/cancelled 포함 가능 |
| `GET /api/account/orders/{id}` | `OrderQueryService.GetOrder` | 단일 호출 | |
| `POST /api/account/orders` | `OrderCommandService.PlaceOrder` | 단일 명령 | 내부에서 잔고/보유 수량 검증 |
| `DELETE /api/account/orders/{id}` | `OrderCommandService.CancelOrder` | 단일 명령 | CAN-001~004 |
| `PATCH /api/account/orders/{id}` | `OrderCommandService.AmendOrder` | 단일 명령 | 원 주문 취소 + parent id를 가진 신규 주문 |
| `GET /api/account/reservations` | `ReservationService.ListReservations` | 단일 호출 | RSV-009 |
| `GET /api/account/reservations/{id}` | `ReservationService.GetReservation` | 단일 호출 | |
| `POST /api/account/reservations` | `ReservationService.CreateReservation` | 단일 명령 | RSV-001~008 검증 |
| `DELETE /api/account/reservations/{id}` | `ReservationService.CancelReservation` | 단일 명령 | RSV-016~018 |
| `PATCH /api/account/reservations/{id}` | `ReservationService.AmendReservation` | 단일 명령 | CAN-006~008 |
| `GET /api/account/watchlist` | `WatchlistService.ListWatchlist`, `MarketService.BatchQuotes` | 병렬 호출 후 병합 | |
| `POST /api/account/watchlist` | `WatchlistService.AddSymbol` | 단일 명령 | |
| `DELETE /api/account/watchlist/{symbol}` | `WatchlistService.RemoveSymbol` | 단일 명령 | |

주문 명령 서비스가 강제해야 할 규칙:

- `CAN-001`: `PENDING` 상태의 지정가 주문만 취소 가능.
- `CAN-002`: `FILLED`, `CANCELLED` 상태 주문은 취소 불가.
- `CAN-003`: 시장가/시간외종가 즉시 주문은 취소 불가.
- `CAN-004`: 예약 금액 반환은 같은 명령 facade 또는 outbox 소비 원장 트랜잭션으로 계좌 원장에 기록.
- `CAN-005`: 대기 중인 지정가 주문 정정 허용.
- `CAN-007`: 정정은 원 주문 취소 + 신규 주문 생성 방식.
- `CAN-008`: 신규 주문은 `parent_order_id` 저장.

예약 명령 서비스가 강제해야 할 규칙:

- `RSV-001~005`: 예약 시점/주문 유형/날짜 제약.
- `RSV-006~008`: 접수 가능 시간창.
- `RSV-010~015`: 예약 실행/상태 전환/만료 지정가 자동 취소. 이는 BFF가 아니라 백엔드 스케줄러/배치 책임.
- 예약 정정은 상태가 `RESERVED`이고 배치 마감 전인지 검증해야 한다.

보유종목 서비스/조회 모델이 만족해야 할 규칙:

- `HLD-001~009`: `OrderFilled` 이벤트 또는 TradingService 같은 트랜잭션으로 생성/갱신.
- `HLD-011`: 미실현손익은 현재가로 계산하며 원천 데이터로 저장하지 않는다.
- `HLD-012`: `include_inactive=true`면 비활성 보유 이력도 포함.

### 4.4 학습

| BFF 엔드포인트 | gRPC 호출 | 방식 | 비고 |
|---|---|---|---|
| `GET /api/learn` | `LearningService.ListContents`, `LearningService.ListUserLearningState` | 병렬 호출 | BFF가 completed/favorite 필드 추가 |
| `GET /api/learn/{id}` | `LearningService.GetContent`, `LearningService.GetUserContentState` | 병렬 호출 | 서비스가 콘텐츠 조회 이벤트 발행 |
| `GET /api/learn/progress` | `LearningService.GetProgressSummary` | 단일 호출 | |
| `GET /api/learn/favorites` | `LearningService.ListFavorites` | 단일 호출 | |
| `GET /api/learn/recommended` | `LearningService.GetRecommendations` | 단일 호출 | 서비스가 추천 조회 모델 사용 가능 |
| `POST /api/learn/{id}/complete` | `LearningService.CompleteContent` | 단일 명령 | `LearningCompleted` 발행 |
| `POST /api/learn/{id}/favorite` | `LearningService.ToggleFavorite` | 단일 명령 | |

관리자 콘텐츠 API는 현재 앱 UI 요청 범위에서 제외한다. 단, 관리자 제품을 계획한다면 서비스 계약에는 생성/수정/삭제/공개 설정을 지원하도록 남겨야 한다.

### 4.5 미션/챌린지/보상

| BFF 엔드포인트 | gRPC 호출 | 방식 | 비고 |
|---|---|---|---|
| `GET /api/missions` | `MissionService.ListMissions`, `MissionService.ListUserMissionStates`, `RewardService.ListClaimStates` | 병렬 호출 | BFF가 joined/status/claimed 조합 |
| `GET /api/missions/{id}` | `MissionService.GetMission`, `MissionService.GetUserMissionState`, `RewardService.GetClaimState` | 병렬 호출 | |
| `GET /api/missions/progress` | `MissionService.GetUserMissionSummary`, `RewardService.ListUserRewards` | 병렬 호출 | 뱃지/업적 포함 |
| `POST /api/missions/{id}/join` | `MissionService.JoinMission` | 단일 명령 | 이미 참여 중이면 멱등 처리 |
| `DELETE /api/missions/{id}/participation` | `MissionService.CancelParticipation` | 단일 명령 | 진행 중 상태만 가능 |
| `POST /api/missions/{id}/progress` | `MissionService.UpdateProgress` | 단일 명령 | 운영에서는 보통 이벤트 기반, 목 수동 갱신용 |
| `POST /api/missions/{id}/claim` | `RewardService.ClaimMissionReward` | 단일 명령 | 미션 상태/조회 모델로 완료 여부 검증 |
| `GET /api/missions/challenges` | `MissionService.ListChallenges`, `MissionService.ListUserChallengeStates` | 병렬 호출 | |
| `GET /api/missions/challenges/{id}` | `MissionService.GetChallenge`, `MissionService.GetUserChallengeState` | 병렬 호출 | |
| `POST /api/missions/challenges/{id}/join` | `MissionService.JoinChallenge` | 단일 명령 | |
| `GET /api/missions/challenges/{id}/result` | `MissionService.GetChallengeResult`, `RewardService.GetChallengeRewardState` | 병렬 호출 | |

미션 완료 처리는 일반적으로 이벤트 기반으로 수행한다:

```text
OrderFilled -> MissionConditionEvaluator -> MissionProgressUpdated -> MissionCompleted
LearningCompleted -> MissionConditionEvaluator -> MissionProgressUpdated -> MissionCompleted
RankingUpdated -> MissionConditionEvaluator -> MissionCompleted
```

보상 지급은 반드시 멱등 처리해야 한다:

- 고유 키: `(user_id, reward_source_type, reward_source_id)`
- 중복 수령 요청은 REST 동작 정책에 따라 이전 수령 결과 또는 `ALREADY_CLAIMED`를 반환한다.
- 보상 원장 기록과 outbox 기록은 하나의 트랜잭션이어야 한다.

### 4.6 랭킹/알림

| BFF 엔드포인트 | gRPC 호출 | 방식 | 비고 |
|---|---|---|---|
| `GET /api/rankings` | `RankingService.ListRankings` | 단일 호출 | 조회 모델 |
| `GET /api/rankings/me` | `RankingService.GetMyRanking` | 단일 호출 | |
| `POST /api/devices/push-token` | `NotificationService.RegisterPushToken` | 단일 명령 | 향후 추가 엔드포인트 |

알림 이벤트는 BFF 부수효과가 아니라 도메인 이벤트에서 생성되어야 한다.

예시:

- `OrderFilled` -> push "주문 체결"
- `ReservationExecuted` -> push "예약 주문 체결"
- `MissionCompleted` -> push "보상 수령 가능"
- `ChallengeEnded` -> push "챌린지 결과 확인"

---

## 5. Proto 초안

아래 proto는 팀 간 계약 초안이다. 실제 repo에서는 `proto/candle/*.proto`로 분리하고 buf lint/호환성 검사를 권장한다.

### 5.1 common.proto

```proto
syntax = "proto3";

package candle.common.v1;

import "google/protobuf/timestamp.proto";

message PageRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message PageResponse {
  string next_page_token = 1;
}

message Money {
  string currency = 1; // KRW, USD
  int64 units = 2;    // KRW는 원 단위. USD 소수점 지원 전 통화별 단위를 먼저 정의
}

message Decimal {
  string value = 1;   // 정확한 decimal 문자열
}

message Audit {
  google.protobuf.Timestamp created_at = 1;
  google.protobuf.Timestamp updated_at = 2;
  int64 version = 3;
}
```

### 5.2 order.proto

```proto
syntax = "proto3";

package candle.order.v1;

import "google/protobuf/timestamp.proto";

enum OrderSide {
  ORDER_SIDE_UNSPECIFIED = 0;
  ORDER_SIDE_BUY = 1;
  ORDER_SIDE_SELL = 2;
}

enum OrderKind {
  ORDER_KIND_UNSPECIFIED = 0;
  ORDER_KIND_MARKET = 1;
  ORDER_KIND_LIMIT = 2;
  ORDER_KIND_AFTER_HOURS_CLOSE = 3;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_FILLED = 2;
  ORDER_STATUS_CANCELLED = 3;
  ORDER_STATUS_REJECTED = 4;
}

message Order {
  string id = 1;
  string user_id = 2;
  string symbol = 3;
  OrderSide side = 4;
  OrderKind kind = 5;
  int64 quantity = 6;
  int64 price = 7;
  int64 amount = 8;
  int64 fee = 9;
  OrderStatus status = 10;
  string parent_order_id = 11;
  int64 reserved_amount = 12;
  google.protobuf.Timestamp created_at = 13;
  google.protobuf.Timestamp executed_at = 14;
  google.protobuf.Timestamp cancelled_at = 15;
}

message PlaceOrderRequest {
  string user_id = 1;
  string symbol = 2;
  OrderSide side = 3;
  OrderKind kind = 4;
  int64 quantity = 5;
  int64 price = 6; // LIMIT일 때 필수
  string idempotency_key = 7;
}

message CancelOrderRequest {
  string user_id = 1;
  string order_id = 2;
  string idempotency_key = 3;
}

message CancelOrderResponse {
  Order order = 1;
  int64 released_amount = 2;
  bool balance_release_committed = 3;
}

message AmendOrderRequest {
  string user_id = 1;
  string order_id = 2;
  int64 quantity = 3;
  int64 price = 4;
  string idempotency_key = 5;
}

message AmendOrderResponse {
  Order original_order = 1;
  Order new_order = 2;
  int64 released_amount = 3;
  int64 new_reserved_amount = 4;
}

message ListOrdersRequest {
  string user_id = 1;
  string symbol = 2;
  OrderStatus status = 3;
}

message ListOrdersResponse {
  repeated Order orders = 1;
}

service OrderCommandService {
  rpc PlaceOrder(PlaceOrderRequest) returns (Order);
  rpc CancelOrder(CancelOrderRequest) returns (CancelOrderResponse);
  rpc AmendOrder(AmendOrderRequest) returns (AmendOrderResponse);
}

service OrderQueryService {
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  rpc GetOrder(CancelOrderRequest) returns (Order);
}
```

### 5.3 reservation.proto

```proto
syntax = "proto3";

package candle.reservation.v1;

import "google/protobuf/timestamp.proto";
import "candle/order/v1/order.proto";

enum ReservationTiming {
  RESERVATION_TIMING_UNSPECIFIED = 0;
  RESERVATION_TIMING_OPEN = 1;        // 09:00
  RESERVATION_TIMING_PREV_CLOSE = 2;  // 08:30
  RESERVATION_TIMING_TODAY_CLOSE = 3; // 15:40
}

enum ReservationStatus {
  RESERVATION_STATUS_UNSPECIFIED = 0;
  RESERVATION_STATUS_RESERVED = 1;
  RESERVATION_STATUS_PENDING = 2;
  RESERVATION_STATUS_FILLED = 3;
  RESERVATION_STATUS_CANCELLED = 4;
  RESERVATION_STATUS_EXPIRED = 5;
}

message Reservation {
  string id = 1;
  string user_id = 2;
  string symbol = 3;
  candle.order.v1.OrderSide side = 4;
  ReservationTiming timing = 5;
  candle.order.v1.OrderKind order_kind = 6;
  int64 quantity = 7;
  int64 price = 8;
  string scheduled_date = 9; // YYYY-MM-DD, KST 기준
  int64 expected_amount = 10;
  int64 expected_fee = 11;
  ReservationStatus status = 12;
  string parent_order_id = 13;
  google.protobuf.Timestamp created_at = 14;
  google.protobuf.Timestamp updated_at = 15;
}

message CreateReservationRequest {
  string user_id = 1;
  string symbol = 2;
  candle.order.v1.OrderSide side = 3;
  ReservationTiming timing = 4;
  candle.order.v1.OrderKind order_kind = 5;
  int64 quantity = 6;
  int64 price = 7;
  string scheduled_date = 8;
  string idempotency_key = 9;
}

message ListReservationsRequest {
  string user_id = 1;
  ReservationStatus status = 2;
}

message ListReservationsResponse {
  repeated Reservation reservations = 1;
}

message CancelReservationRequest {
  string user_id = 1;
  string reservation_id = 2;
  string idempotency_key = 3;
}

message AmendReservationRequest {
  string user_id = 1;
  string reservation_id = 2;
  ReservationTiming timing = 3;
  candle.order.v1.OrderKind order_kind = 4;
  int64 quantity = 5;
  int64 price = 6;
  string scheduled_date = 7;
  string idempotency_key = 8;
}

service ReservationService {
  rpc ListReservations(ListReservationsRequest) returns (ListReservationsResponse);
  rpc GetReservation(CancelReservationRequest) returns (Reservation);
  rpc CreateReservation(CreateReservationRequest) returns (Reservation);
  rpc CancelReservation(CancelReservationRequest) returns (Reservation);
  rpc AmendReservation(AmendReservationRequest) returns (Reservation);
}
```

### 5.4 account_holding.proto

```proto
syntax = "proto3";

package candle.account.v1;

message AccountBalance {
  string user_id = 1;
  int64 cash = 2;
  int64 reserved_balance = 3;
  int64 available_cash = 4;
  int64 total_asset = 5;
}

message Holding {
  string user_id = 1;
  string symbol = 2;
  int64 quantity = 3;
  int64 average_price = 4;
  int64 realized_profit = 5;
  bool is_active = 6;
}

message GetBalanceRequest {
  string user_id = 1;
}

message ListHoldingsRequest {
  string user_id = 1;
  bool include_inactive = 2;
}

message ListHoldingsResponse {
  repeated Holding holdings = 1;
}

service AccountService {
  rpc GetBalance(GetBalanceRequest) returns (AccountBalance);
}

service HoldingService {
  rpc ListHoldings(ListHoldingsRequest) returns (ListHoldingsResponse);
  rpc GetHolding(Holding) returns (Holding);
}
```

### 5.5 learning.proto

```proto
syntax = "proto3";

package candle.learning.v1;

message LearnContent {
  string id = 1;
  string title = 2;
  string description = 3;
  string category = 4;
  string level = 5;
  string duration = 6;
  int64 read_count = 7;
  repeated string keywords = 8;
  string body = 9;
  bool published = 10;
}

message UserLearningState {
  string user_id = 1;
  string content_id = 2;
  bool completed = 3;
  bool favorite = 4;
}

message ListContentsRequest {
  string category = 1;
  string level = 2;
  string query = 3;
  bool favorite_only = 4;
  string user_id = 5;
}

message ListContentsResponse {
  repeated LearnContent contents = 1;
  repeated UserLearningState states = 2;
}

message CompleteContentRequest {
  string user_id = 1;
  string content_id = 2;
  string idempotency_key = 3;
}

service LearningService {
  rpc ListContents(ListContentsRequest) returns (ListContentsResponse);
  rpc GetContent(CompleteContentRequest) returns (LearnContent);
  rpc CompleteContent(CompleteContentRequest) returns (UserLearningState);
  rpc ToggleFavorite(CompleteContentRequest) returns (UserLearningState);
}
```

### 5.6 mission_reward.proto

```proto
syntax = "proto3";

package candle.mission.v1;

import "google/protobuf/timestamp.proto";

enum MissionStatus {
  MISSION_STATUS_UNSPECIFIED = 0;
  MISSION_STATUS_AVAILABLE = 1;
  MISSION_STATUS_IN_PROGRESS = 2;
  MISSION_STATUS_COMPLETED = 3;
  MISSION_STATUS_FAILED = 4;
  MISSION_STATUS_CANCELLED = 5;
}

message Mission {
  string id = 1;
  string category = 2;
  string title = 3;
  string description = 4;
  int64 reward_points = 5;
  int64 condition_total = 6;
  string badge_reward = 7;
  string achievement_reward = 8;
  google.protobuf.Timestamp starts_at = 9;
  google.protobuf.Timestamp ends_at = 10;
  string icon = 11;
}

message UserMissionState {
  string user_id = 1;
  string mission_id = 2;
  MissionStatus status = 3;
  int64 progress = 4;
  bool joined = 5;
  bool claimed = 6;
  google.protobuf.Timestamp joined_at = 7;
  google.protobuf.Timestamp completed_at = 8;
}

message Challenge {
  string id = 1;
  string title = 2;
  string description = 3;
  string season = 4;
  google.protobuf.Timestamp starts_at = 5;
  google.protobuf.Timestamp ends_at = 6;
  string status = 7; // 예정, 진행 중, 종료
  int64 participants = 8;
  int64 reward_points = 9;
  string badge_reward = 10;
}

message UserChallengeState {
  string user_id = 1;
  string challenge_id = 2;
  bool joined = 3;
  int64 rank = 4;
  string return_percent = 5;
}

message ClaimRewardRequest {
  string user_id = 1;
  string source_type = 2; // mission, challenge
  string source_id = 3;
  string idempotency_key = 4;
}

message ClaimRewardResponse {
  int64 rewarded_points = 1;
  string rewarded_badge = 2;
  string rewarded_achievement = 3;
  int64 total_points = 4;
  bool already_claimed = 5;
}

service MissionService {
  rpc ListMissions(UserMissionState) returns (stream Mission);
  rpc GetMission(UserMissionState) returns (Mission);
  rpc ListUserMissionStates(UserMissionState) returns (stream UserMissionState);
  rpc JoinMission(UserMissionState) returns (UserMissionState);
  rpc CancelMissionParticipation(UserMissionState) returns (UserMissionState);
  rpc UpdateProgress(UserMissionState) returns (UserMissionState);
  rpc ListChallenges(UserChallengeState) returns (stream Challenge);
  rpc GetChallenge(UserChallengeState) returns (Challenge);
  rpc JoinChallenge(UserChallengeState) returns (UserChallengeState);
}

service RewardService {
  rpc ClaimReward(ClaimRewardRequest) returns (ClaimRewardResponse);
}
```

---

## 6. Outbox와 CDC 계약

### 6.1 Outbox 테이블

각 서비스는 자신의 DB 트랜잭션 안에서 도메인 행 변경과 outbox 행 기록을 함께 커밋한다.

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id VARCHAR(120) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  event_version INT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key VARCHAR(160),
  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  trace_id VARCHAR(120),
  UNIQUE(event_type, aggregate_id, event_version)
);
```

CDC/outbox 발행기 규칙:

- 최소 1회 이상 전달을 전제로 한다.
- 소비자는 `(event_id)` 또는 `(source_service, event_id)` 기준으로 멱등 처리한다.
- 이벤트 스키마는 하위 호환을 유지하며 진화한다.
- 삭제 이벤트도 소프트 삭제 상태를 포함한다.
- 이벤트 페이로드에는 민감정보를 넣지 않는다. 필요한 서비스가 API로 재조회한다.

### 6.2 핵심 이벤트

| 이벤트 | 발행 서비스 | 소비 서비스 | 목적 |
|---|---|---|---|
| `UserCreated` | Auth/User | Account, Mission, Notification | 기본 계좌/프로필 준비 |
| `UserWithdrawn` | User | Account, Auth, Notification | 관련 리소스 비활성화 |
| `OrderPlaced` | Order | Account, Mission | 예약 잔고 반영, 미션 진행 |
| `OrderFilled` | Order | Account, Holding, Mission, Ranking, Notification | 현금/보유종목 정산, 미션 진행, 랭킹 반영 |
| `OrderCancelled` | Order | Account, Mission, Notification | 예약 잔고 반환 |
| `OrderAmended` | Order | Account, Notification | 기존 예약 해제 + 신규 예약 |
| `ReservationCreated` | Reservation | Account, Notification | 매수 예약이면 예상 금액 예약 |
| `ReservationCancelled` | Reservation | Account, Notification | 예약 금액 반환 |
| `ReservationExecuted` | Reservation | Order, Account, Holding, Mission, Notification | 체결 또는 pending 주문 전환 |
| `ReservationExpired` | Reservation | Account, Notification | 자동 취소 및 예약 금액 반환 |
| `HoldingUpdated` | Holding | Ranking, Portfolio | 랭킹/포트폴리오 프로젝션 갱신 |
| `LearningCompleted` | Learning | Mission, Reward candidate | 학습 미션 진행 |
| `MissionJoined` | Mission | Notification | 사용자 미션 참여 |
| `MissionProgressUpdated` | Mission | Notification optional | 진행 상태 추적 |
| `MissionCompleted` | Mission | Reward, Notification | 수령 가능한 보상 생성 |
| `MissionFailed` | Mission | Notification | 실패 상태 반영 |
| `RewardClaimed` | Reward | Account/Profile, Notification | 포인트/뱃지/업적 반영 |
| `ChallengeJoined` | Mission | Ranking/Challenge 프로젝션 | 참여자 수 반영 |
| `ChallengeEnded` | Mission | Reward, Notification | 결과 및 보상 반영 |
| `PushTokenRegistered` | Notification | 없음 | push 토큰 생명주기 관리 |

### 6.3 이벤트 Payload 예시

```json
{
  "eventId": "018f...",
  "eventType": "OrderCancelled",
  "eventVersion": 1,
  "occurredAt": "2026-06-18T10:10:00+09:00",
  "traceId": "req_...",
  "payload": {
    "userId": "u_demo",
    "orderId": "o_123",
    "symbol": "005930",
    "releasedAmount": 700105,
    "reason": "USER_REQUEST"
  }
}
```

```json
{
  "eventId": "0190...",
  "eventType": "RewardClaimed",
  "eventVersion": 1,
  "occurredAt": "2026-06-18T10:11:00+09:00",
  "payload": {
    "userId": "u_demo",
    "sourceType": "MISSION",
    "sourceId": "m1",
    "rewardedPoints": 500,
    "rewardedBadge": "첫 거래",
    "rewardedAchievement": null
  }
}
```

### 6.4 정합성 요구사항

주문 취소/정정:

- 원 주문 상태 전이와 outbox 기록은 원자적으로 처리한다.
- 계좌 예약 금액 반환은 `order_id`와 이벤트 타입 기준으로 멱등 처리한다.
- Account 소비자가 실패하면 이벤트는 미발행/미확인 상태로 남고 재시도된다.
- 문서화된 명령 facade를 쓰는 경우가 아니라면 BFF가 Account 반환 처리를 직접 호출하지 않는다.

주문 체결 -> 보유종목:

- Holding 소비자는 `OrderFilled`를 멱등 처리한다.
- 매수:
  - 활성 보유종목이 없으면 생성한다.
  - 비활성 보유종목이면 재활성화하고 기준 단가를 초기화한다.
  - 평균단가는 가중평균으로 계산한다.
- 매도:
  - 수량을 차감한다.
  - 실현손익을 누적한다.
  - 수량이 0이 되면 `is_active=false`로 변경한다.

보상 수령:

- RewardService 트랜잭션:
  - 보상 원천이 완료/수령 가능 상태인지 검증한다.
  - 고유 원천 키로 보상 원장을 기록한다.
  - outbox에 `RewardClaimed`를 기록한다.
- 같은 멱등성 키의 중복 요청은 같은 결과를 반환한다.
- 같은 source에 대한 중복 수령 요청은 `FAILED_PRECONDITION` 또는 이전 결과를 반환한다. 둘 중 하나로 정하고 REST 동작을 안정적으로 유지한다.

예약 실행:

- 스케줄러/배치가 KST 실행 시각에 ReservationService 명령을 트리거한다.
- 서비스는 상태 전이와 outbox 이벤트를 원자적으로 기록한다.
- `prev_close`, `today_close` 즉시 체결 이벤트에는 체결가 원천을 포함해야 한다.
- 시가 지정가 예약은 OrderService 명령 또는 이벤트 기반 명령 소비자를 통해 pending 주문으로 전환한다.

---

## 7. BFF 조합 규칙

### 7.1 병렬 호출

BFF는 제한된 병렬성을 사용해야 한다. `GET /api/missions` 예시:

```text
병렬 호출:
  A = MissionService.ListMissions(category/status)
  B = MissionService.ListUserMissionStates(user_id)
  C = RewardService.ListClaimStates(user_id)

병합:
  각 mission에 대해:
    state = B[mission.id] 또는 기본 available
    claim = C[mission.id] 또는 기본 unclaimed
    return REST Mission DTO
```

A가 실패하면 엔드포인트도 실패한다. B 또는 C가 실패하면 사용자별 인증 데이터가 불완전해지므로 기본 정책은 엔드포인트 실패여야 한다. 조용한 대체 응답은 보상 미수령/미참여 상태를 잘못 보여줄 수 있으므로, 제품에서 오래된 데이터 표시를 명시적으로 허용하지 않는 한 피한다.

### 7.2 프로젝션 병합

보유종목:

```text
병렬 호출:
  holdings = HoldingService.ListHoldings(user_id, include_inactive)
  quotes = MarketService.BatchQuotes(symbols)

병합:
  currentPrice = quotes[symbol].price or holding.lastKnownPrice
  unrealizedProfit = (currentPrice - averagePrice) * quantity
  unrealizedProfitRate = unrealizedProfit / (averagePrice * quantity)
```

마이페이지 요약:

```text
병렬 호출:
  profile = UserService.GetMe
  account = AccountService.GetBalance
  mission = MissionService.GetUserMissionSummary
  learning = LearningService.GetProgressSummary
  ranking = RankingService.GetMyRanking
```

### 7.3 제한적 대체 응답

대체 응답을 허용할 수 있는 필드:

- 뉴스 제공자 실패 시 시장 뉴스는 빈 목록을 반환할 수 있다.
- 추천 서비스 실패 시 추천 콘텐츠는 인기 콘텐츠로 대체할 수 있다.
- 알림 토큰 등록은 백그라운드에서 재시도할 수 있다.

대체 응답을 허용하지 않는 필드:

- 잔고
- 주문 상태
- 보유 수량
- 보상 수령 상태
- 인증/사용자 상태

---

## 8. 요구사항 매핑

### 8.1 Reservation RSV

| 요구사항 | 소유 서비스 | BFF 역할 |
|---|---|---|
| RSV-001~005 | ReservationService | 요청 전달, 검증 오류 노출 |
| RSV-006~008 | ReservationService | 요청 전달, UI 힌트 외 로컬 시간 판단 금지 |
| RSV-009 | ReservationService | 현재 사용자의 예약 주문 목록 조회 |
| RSV-010~015 | ReservationService + Scheduler + Order/Account/Holding 이벤트 | 처리 결과 상태 조회 |
| RSV-016~018 | ReservationService | 취소 명령 전달 |

### 8.2 Cancel/Amend CAN

| 요구사항 | 소유 서비스 | BFF 역할 |
|---|---|---|
| CAN-001~003 | OrderCommandService | `FAILED_PRECONDITION`을 409로 매핑 |
| CAN-004 | Order/Account 명령 facade 또는 outbox/CDC | 반환된 예약 금액 해제 상태 표시 |
| CAN-005 | OrderCommandService | 정정 명령 전달 |
| CAN-006 | ReservationService | 예약 정정 명령 전달 |
| CAN-007~008 | Order/Reservation 서비스 | 원 주문 연결 관계 표시 |

### 8.3 Holding HLD

| 요구사항 | 소유 서비스 | BFF 역할 |
|---|---|---|
| HLD-001, HLD-004~009 | HoldingService 소비자 또는 TradingService | 쓰기 처리 없음 |
| HLD-002~003, HLD-010, HLD-012 | HoldingService | 현재 사용자 보유종목 조회 |
| HLD-011 | HoldingService + MarketService + BFF 병합 | 시세 기반 계산/표시 |

### 8.4 Learn

| 요구사항 | 소유 서비스 | BFF 역할 |
|---|---|---|
| LEARN-001~003, LEARN-014~015 | LearningService 관리자 API | 현재 사용자 UI 범위 아님 |
| LEARN-004~008 | LearningService | 목록/상세/검색/조회수 |
| LEARN-009~012 | LearningService | 완료/진도/즐겨찾기 |
| LEARN-013 | LearningService 추천 프로젝션 | 추천 콘텐츠 표시 |

### 8.5 Mission

| 요구사항 | 소유 서비스 | BFF 역할 |
|---|---|---|
| MISSION-001~003, 018~020 | MissionService 관리자 API | 관리자 BFF 라우트에서 추후 사용 |
| MISSION-004~008 | MissionService | 목록/상세/참여/취소/진행 |
| MISSION-009~010 | MissionService 조건 평가기 + 스케줄러 | 처리 결과 상태 조회 |
| MISSION-011~014 | MissionService 챌린지 API | 목록/상세/참여/결과 |
| MISSION-015~017 | RewardService | 수령/보상/뱃지/업적 표시 |

---

## 9. 서비스 팀 구현 체크리스트

### 9.1 Proto와 게이트웨이

- 서비스 소유 패키지 안에 proto를 정의한다.
- enum은 `UNSPECIFIED = 0`을 사용한다.
- 메타데이터에 `user_id`가 있어도 요청 본문에도 포함한다. 서비스는 두 값을 비교하고 권한을 검증해야 한다.
- 모든 명령에 `idempotency_key`를 사용한다.
- 소유 서비스가 생성한 안정적인 ID를 반환한다.
- 낙관적 잠금이 필요한 변경 가능 aggregate(애그리거트)에는 `version`을 포함한다.

### 9.2 트랜잭션 Outbox

- 다른 서비스에 영향을 주는 모든 상태 변경 명령은 같은 DB 트랜잭션에서 outbox를 기록해야 한다.
- Outbox 발행기는 최소 1회 이상 발행을 보장해야 한다.
- 소비자는 멱등 처리되어야 한다.
- 소비자는 처리한 이벤트 ID를 저장해야 한다.
- 문제 이벤트에는 재시도 한도와 dead-letter 처리가 필요하다.
- CDC 지연 시간은 관측 가능해야 한다.

### 9.3 관측성

모든 서비스는 아래 값을 로그/트레이스에 포함해야 한다:

- `request_id`
- `trace_id`
- `user_id`
- `idempotency_key`
- aggregate(애그리거트) ID
- 이벤트 ID
- gRPC 메서드
- 제한 시간 초과 횟수

메트릭:

- 명령 지연 시간
- gRPC 에러 코드별 횟수
- 미발행 outbox 수
- CDC 지연 시간(초)
- 소비자 재시도 횟수
- dead-letter 수
- 멱등성 중복 요청 수

### 9.4 테스트 시나리오

주문:

- pending 지정가 주문 취소 시 예약 금액이 정확히 한 번 반환된다.
- 체결 주문 취소는 conflict를 반환한다.
- 시장가 즉시 주문 취소는 conflict를 반환한다.
- 정정은 `parent_order_id`를 가진 신규 주문을 생성한다.
- 같은 멱등성 키의 중복 취소는 같은 응답을 반환한다.

예약:

- 전일종가 예약 날짜는 내일로 고정된다.
- 시가/당일종가 예약 날짜는 내일부터 +7일까지 허용된다.
- 허용되지 않는 주문 유형은 거부된다.
- 마감 전 RESERVED 예약 정정은 성공한다.
- 마감 후 정정은 실패한다.
- 스케줄러 실행 시 기대한 이벤트가 발행된다.

보유종목:

- 최초 매수는 보유종목을 생성한다.
- 추가 매수는 가중평균으로 평균단가를 재계산한다.
- 매도는 수량을 차감하고 실현손익을 누적한다.
- 수량 0은 소프트 삭제 처리한다.
- 비활성 보유종목 재매수는 재활성화하고 기준 데이터를 초기화한다.

보상:

- 완료된 미션 보상은 한 번만 수령 성공한다.
- 미완료 미션 보상 수령은 conflict를 반환한다.
- 중복 수령으로 이중 지급되지 않는다.
- 뱃지/업적은 멱등 지급된다.

학습/미션:

- 학습 콘텐츠 완료 시 `LearningCompleted`가 발행된다.
- 미션 진행 소비자가 매칭되는 미션을 갱신한다.
- 마감 작업이 미완료 미션을 실패 처리한다.
- 챌린지 결과는 참여 사용자만 조회할 수 있다.

---

## 10. 확정이 필요한 사항

구현 범위를 고정하기 전에 아래 사항을 결정해야 한다.

1. Order/Account/Holding 소유권:
   - 단일 TradingService facade로 둘지, 분리 서비스 + 명령 조율로 둘지 결정.

2. 취소/정정 후 잔고 일관성 수준:
   - REST 응답이 예약 금액 반환 커밋까지 기다릴지, 반환 대기 상태를 응답할지 결정.

3. Decimal 모델:
   - 현재 요구사항은 KRW/주식 수량 정수를 사용한다. 해외 소수점 거래는 별도 decimal 계약이 필요하다.

4. 랭킹 갱신 주기:
   - 보유종목 변경마다 실시간 갱신할지, 스케줄 기반 프로젝션으로 갱신할지 결정.

5. 알림 페이로드 정책:
   - FCM 페이로드에는 라우팅 ID만 넣고, 민감 상세 정보는 앱 진입 후 API로 조회한다.

6. 관리자 API:
   - 같은 BFF에서 제공할지, 별도 관리자 BFF로 분리할지 결정.

7. CDC 기술:
   - Debezium, Kafka Connect, 커스텀 outbox 발행기, DB logical replication 중 선택.

8. Proto 저장소:
   - 모노레포의 `proto/` 폴더로 둘지, 버전 패키지를 가진 별도 계약 저장소로 둘지 결정.
