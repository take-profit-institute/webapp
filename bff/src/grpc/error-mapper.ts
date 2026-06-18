import { GrpcStatus, type GrpcError } from './types';

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

export function isGrpcError(err: unknown): err is GrpcError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as GrpcError).code === 'number'
  );
}

export function grpcToHttpStatus(code: number): number {
  return STATUS_MAP[code] ?? 500;
}

export function mapGrpcError(err: unknown): { statusCode: number; message: string } {
  if (isGrpcError(err)) {
    return {
      statusCode: grpcToHttpStatus(err.code),
      message: err.details ?? err.message,
    };
  }
  return { statusCode: 500, message: 'Internal server error' };
}
