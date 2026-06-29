import { Metadata } from 'nice-grpc';
import type { ClientMiddleware } from 'nice-grpc';
import type { ClientMiddlewareCall, CallOptions } from 'nice-grpc-common';
import type { GrpcCallOptions } from '../types';
import { IDEMPOTENCY_METADATA, ACTOR_METADATA } from './key';

export function createIdempotencyInterceptor(): ClientMiddleware<GrpcCallOptions> {
  return async function* <Request, Response>(
    call: ClientMiddlewareCall<Request, Response>,
    options: CallOptions & Partial<GrpcCallOptions>,
  ): AsyncGenerator<Response, Response | void, undefined> {
    const metadata = Metadata(options.metadata);
    if (options.idempotencyKey) metadata.set(IDEMPOTENCY_METADATA, options.idempotencyKey);
    if (options.userId) metadata.set(ACTOR_METADATA, options.userId);
    // unary 메서드는 미들웨어가 응답 메시지를 return해야 함(yield만 하면 void 반환 → nice-grpc 에러).
    return yield* call.next(call.request, { ...options, metadata });
  };
}
