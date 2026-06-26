import { ClientError } from 'nice-grpc';
import { GrpcStatus } from './types';

const STATUS_MAP: Record<number, number> = {
  [GrpcStatus.NOT_FOUND]: 404,
  [GrpcStatus.ALREADY_EXISTS]: 409,
  [GrpcStatus.INVALID_ARGUMENT]: 400,
  [GrpcStatus.UNAUTHENTICATED]: 401,
  [GrpcStatus.PERMISSION_DENIED]: 403,
  [GrpcStatus.RESOURCE_EXHAUSTED]: 429,
  [GrpcStatus.DEADLINE_EXCEEDED]: 504,
  [GrpcStatus.UNAVAILABLE]: 503,
  [GrpcStatus.FAILED_PRECONDITION]: 422,
  [GrpcStatus.ABORTED]: 409,
  [GrpcStatus.CANCELLED]: 499,
  [GrpcStatus.INTERNAL]: 500,
  [GrpcStatus.UNKNOWN]: 500,
};

export function grpcToHttpStatus(code: number): number {
  return STATUS_MAP[code] ?? 500;
}

export function mapGrpcError(err: unknown): { statusCode: number; message: string } {
  if (err instanceof ClientError) {
    return {
      statusCode: grpcToHttpStatus(err.code),
      message: err.details || err.message,
    };
  }
  // ClientError가 아닌 경우 — 연결 실패(ECONNREFUSED 등) 가능성
  const msg = err instanceof Error ? err.message : 'Internal server error';
  console.error('[grpc] unexpected non-ClientError:', err);
  return { statusCode: 503, message: msg };
}
