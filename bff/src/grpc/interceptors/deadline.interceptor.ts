import type { ClientMiddleware } from 'nice-grpc';
import type { ClientMiddlewareCall, CallOptions } from 'nice-grpc-common';
import type { GrpcCallOptions } from '../types';

export type ClientInterceptor = ClientMiddleware<GrpcCallOptions>;

export function createDeadlineInterceptor(defaultMs: number): ClientInterceptor {
  return async function* <Request, Response>(
    call: ClientMiddlewareCall<Request, Response>,
    options: CallOptions & Partial<GrpcCallOptions>,
  ): AsyncGenerator<Response, Response | void, undefined> {
    const ms = options?.deadlineMs ?? defaultMs;
    const signal = options.signal ?? AbortSignal.timeout(ms);
    // unary 메서드는 미들웨어가 응답 메시지를 return해야 함(yield만 하면 void 반환 → nice-grpc 에러).
    return yield* call.next(call.request, { ...options, signal });
  };
}
