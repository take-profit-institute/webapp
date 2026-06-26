import { ClientError } from 'nice-grpc';
import type { ClientMiddleware } from 'nice-grpc';
import type { ClientMiddlewareCall, CallOptions } from 'nice-grpc-common';
import type { GrpcCallOptions } from '../types';

export function createLoggingInterceptor(): ClientMiddleware<GrpcCallOptions> {
  return async function* <Request, Response>(
    call: ClientMiddlewareCall<Request, Response>,
    options: CallOptions & Partial<GrpcCallOptions>,
  ): AsyncGenerator<Response, Response | void, undefined> {
    const start = Date.now();
    const method = call.method.path;
    try {
      return yield* call.next(call.request, options);
    } catch (err) {
      const code = err instanceof ClientError ? err.code : 'UNKNOWN';
      console.warn(`[grpc] ${method} error code=${code} ${Date.now() - start}ms`);
      throw err;
    } finally {
      console.debug(`[grpc] ${method} ${Date.now() - start}ms`);
    }
  };
}
