/**
 * 멱등성 키 검증 + 공용 상수 (BFF = 호출 어댑터 측).
 *
 * BFF는 "호출 어댑터"로서 클라이언트가 보낸 키를 검증·전파만 한다.
 * 키를 직접 만들거나 덮어쓰지 않는다 — 생성은 프론트(의도당 1개)의 책임이다.
 * BFF가 매 HTTP 요청마다 새로 만들면, 클라이언트 재시도(=새 HTTP 요청)가
 * 새 키를 받게 되어 멱등성이 깨진다.
 */

/** 프론트가 키를 실어 보내는 HTTP 헤더. */
export const IDEMPOTENCY_HEADER = 'idempotency-key';
/** 소유 서비스 interceptor가 읽는 gRPC metadata 키. */
export const IDEMPOTENCY_METADATA = 'x-idempotency-key';
/** 인증된 actor를 싣는 gRPC metadata 키. */
export const ACTOR_METADATA = 'x-user-id';
/** 서버는 최대 VARCHAR(64)로 저장 — 더 길면 앞단에서 거절. */
export const MAX_KEY_LENGTH = 64;

const UUID_CANONICAL =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type IdempotencyKeyErrorCode = 'IDEMPOTENCY_KEY_INVALID';

/** 쓰기 요청에 키가 없거나 형식이 잘못됐을 때 던진다. HTTP 400으로 매핑된다. */
export class IdempotencyKeyError extends Error {
  readonly statusCode = 400;
  readonly errorCode: IdempotencyKeyErrorCode = 'IDEMPOTENCY_KEY_INVALID';
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyKeyError';
  }
}

/** 길이 제한 내의 canonical UUID 문자열이면 true. */
export function isValidIdempotencyKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_KEY_LENGTH &&
    UUID_CANONICAL.test(value)
  );
}

/** 키를 검증해 반환하거나 IdempotencyKeyError를 던진다. BFF는 키를 만들지 않는다. */
export function assertIdempotencyKey(value: unknown): string {
  if (!isValidIdempotencyKey(value)) {
    throw new IdempotencyKeyError(
      'Idempotency-Key는 canonical UUID 문자열이어야 합니다 (최대 64자).',
    );
  }
  return value;
}
