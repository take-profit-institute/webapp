/**
 * Deadline interceptor — propagates HTTP request timeout as gRPC call deadline.
 *
 * TODO: Implement after `pnpm add nice-grpc @grpc/grpc-js`:
 *
 *   import { ClientMiddleware } from 'nice-grpc';
 *   import type { GrpcCallOptions } from '../types';
 *
 *   export const deadlineInterceptor: ClientMiddleware<GrpcCallOptions> =
 *     async function* (call, options, next) {
 *       const deadline = new Date(
 *         Date.now() + (options?.deadlineMs ?? env.grpc.deadlineMs),
 *       );
 *       yield* next(call, { ...options, deadline });
 *     };
 *
 * The `deadline` field is picked up by nice-grpc and forwarded to @grpc/grpc-js.
 * Do NOT set deadline here when running behind Istio with global timeouts configured
 * at the VirtualService level — they would conflict.
 */

export type ClientInterceptor = unknown; // replace with nice-grpc ClientMiddleware<GrpcCallOptions>

export function createDeadlineInterceptor(_defaultMs: number): ClientInterceptor {
  // TODO: implement (see above)
  return undefined as ClientInterceptor;
}
