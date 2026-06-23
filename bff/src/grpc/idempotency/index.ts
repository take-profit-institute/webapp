/**
 * 멱등성 유틸 — 쓰기 gRPC 호출에서 재사용하는 공용 모듈.
 *
 * 책임 분리:
 *   - 프론트(웹/앱): 사용자 의도당 UUIDv7 키 생성, 재시도 시 같은 키 재사용.
 *   - BFF(이 모듈): Idempotency-Key 헤더 검증(requireIdempotencyKey) →
 *                   GrpcCallOptions.idempotencyKey 단일 소스 →
 *                   metadata(인터셉터) + body(withCommandMetadata) 동시 주입.
 *   - 소유 서비스(Java): hash / DB / outbox 처리.
 */
export {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_METADATA,
  ACTOR_METADATA,
  MAX_KEY_LENGTH,
  IdempotencyKeyError,
  isValidIdempotencyKey,
  assertIdempotencyKey,
  type IdempotencyKeyErrorCode,
} from './key';
export { requireIdempotencyKey } from './http';
export {
  buildCommandMetadata,
  withCommandMetadata,
  type CommandMetadata,
  type HasCommandMetadata,
} from './command-metadata';
export { deriveIdempotencyKey } from './derived-key';
export { createIdempotencyInterceptor } from './interceptor';
