/**
 * Logging interceptor — records every gRPC call with method path, latency, and status.
 * Integrates with Fastify's pino logger via the passed logger reference.
 *
 * TODO: Implement after `pnpm add nice-grpc @grpc/grpc-js`:
 *
 *   import { ClientMiddleware, ClientError } from 'nice-grpc';
 *   import type { FastifyBaseLogger } from 'fastify';
 *
 *   export function createLoggingInterceptor(log: FastifyBaseLogger): ClientMiddleware {
 *     return async function* (call, options, next) {
 *       const start = Date.now();
 *       const method = call.method.path;
 *       try {
 *         const result = yield* next(call, options);
 *         log.debug({ method, ms: Date.now() - start }, 'grpc ok');
 *         return result;
 *       } catch (err) {
 *         const code = err instanceof ClientError ? err.code : 'UNKNOWN';
 *         log.warn({ method, ms: Date.now() - start, code }, 'grpc error');
 *         throw err;
 *       }
 *     };
 *   }
 *
 * Slow-call threshold: log.warn when ms > env.grpc.deadlineMs * 0.8.
 */

import type { ClientInterceptor } from './deadline.interceptor';

export function createLoggingInterceptor(): ClientInterceptor {
  // TODO: implement (see above)
  return undefined as ClientInterceptor;
}
