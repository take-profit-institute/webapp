/** Options forwarded to every gRPC call. Populated by BFF from the HTTP request context. */
export interface GrpcCallOptions {
  /** Absolute epoch-ms deadline. Derived from env.grpc.deadlineMs when not set. */
  deadlineMs?: number;
  /** Propagated from HTTP X-Request-ID header. */
  requestId?: string;
  /** Extracted from JWT — sent as gRPC metadata `user_id`. */
  userId?: string;
  /**
   * 쓰기 호출의 멱등성 키 단일 소스. 프론트의 Idempotency-Key 헤더에서 온다.
   * 인터셉터가 metadata `x-idempotency-key`로, withCommandMetadata()가
   * request body `command_metadata.idempotency_key`로 같은 값을 주입한다.
   * 읽기 호출에는 비워 둔다.
   */
  idempotencyKey?: string;
}

/** Subset of gRPC canonical status codes used in BFF error mapping. */
export const GrpcStatus = {
  OK: 0,
  CANCELLED: 1,
  UNKNOWN: 2,
  INVALID_ARGUMENT: 3,
  DEADLINE_EXCEEDED: 4,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6,
  PERMISSION_DENIED: 7,
  RESOURCE_EXHAUSTED: 8,
  FAILED_PRECONDITION: 9,
  ABORTED: 10,
  INTERNAL: 13,
  UNAVAILABLE: 14,
  UNAUTHENTICATED: 16,
} as const;

export type GrpcStatusCode = (typeof GrpcStatus)[keyof typeof GrpcStatus];

/** Shape of a gRPC error thrown by nice-grpc (or compatible adapters). */
export interface GrpcError extends Error {
  code: GrpcStatusCode;
  details?: string;
}

/** Marker for empty proto requests (google.protobuf.Empty equivalent). */
export type EmptyRequest = Record<never, never>;

/**
 * Throws a clear stub error.
 * Replace call sites with real nice-grpc client calls after proto generation.
 */
export function notImplemented(service: string, method: string): never {
  throw new Error(`[gRPC stub] ${service}.${method} — wire real client after proto generation`);
}
