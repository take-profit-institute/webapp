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
    yield* call.next(call.request, { ...options, metadata });
  };
}
