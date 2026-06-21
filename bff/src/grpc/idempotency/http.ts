import type { FastifyRequest } from 'fastify';
import { IDEMPOTENCY_HEADER, assertIdempotencyKey } from './key';

/**
 * 쓰기 요청에서 클라이언트가 보낸 Idempotency-Key 헤더를 추출·검증한다.
 *
 * BFF는 호출 어댑터일 뿐 — 키를 생성하거나 덮어쓰지 않는다.
 * 키가 없거나 형식이 잘못되면 IdempotencyKeyError(HTTP 400)를 던지고,
 * app.ts의 전역 에러 핸들러가 표준 에러 응답으로 매핑한다.
 * 입력 형식 실패는 멱등성 record를 만들지 않는다 (스펙 §4).
 */
export function requireIdempotencyKey(req: FastifyRequest): string {
  const raw = req.headers[IDEMPOTENCY_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return assertIdempotencyKey(value);
}
