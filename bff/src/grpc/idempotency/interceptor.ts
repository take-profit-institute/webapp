/**
 * 멱등성 인터셉터 — call options의 키 + actor를 gRPC metadata로 전파한다.
 *
 * TODO: `pnpm add nice-grpc @grpc/grpc-js` 이후 구현:
 *
 *   import { ClientMiddleware, Metadata } from 'nice-grpc';
 *   import type { GrpcCallOptions } from '../types';
 *   import { IDEMPOTENCY_METADATA, ACTOR_METADATA } from './key';
 *
 *   export const idempotencyInterceptor: ClientMiddleware<GrpcCallOptions> =
 *     async function* (call, options, next) {
 *       const metadata = Metadata(options.metadata);
 *       if (options.idempotencyKey) metadata.set(IDEMPOTENCY_METADATA, options.idempotencyKey);
 *       if (options.userId) metadata.set(ACTOR_METADATA, options.userId);
 *       return yield* next(call, { ...options, metadata });
 *     };
 *
 * 같은 options.idempotencyKey가 withCommandMetadata()로 요청 본문에도 쓰이므로,
 * metadata `x-idempotency-key`와 message `command_metadata.idempotency_key`는 항상 일치한다.
 * 여기서 키를 만들지 말 것 — 키가 없다는 건 호출부가 헤더 검증을 빠뜨렸다는 뜻이다.
 */
import type { ClientInterceptor } from '../interceptors/deadline.interceptor';

export function createIdempotencyInterceptor(): ClientInterceptor {
  // TODO: 구현 (위 주석 참고)
  return undefined as ClientInterceptor;
}
