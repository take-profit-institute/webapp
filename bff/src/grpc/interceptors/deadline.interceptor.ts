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
    yield* call.next(call.request, { ...options, signal });
  };
}
