import { ClientError } from 'nice-grpc';
import { ERROR_CODES, type ErrorCode } from './error-codes';
import { buildErrorResponse, type PublicErrorResponse } from './error-response';
import { GrpcStatus } from '../grpc/types';

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

const UPSTREAM_CODE_MAP: Record<string, ErrorCode> = {
  AUTH_USER_NOT_FOUND: ERROR_CODES.USER_NOT_FOUND,
  USER_NOT_FOUND: ERROR_CODES.USER_NOT_FOUND,
  STOCK_NOT_FOUND: ERROR_CODES.STOCK_NOT_FOUND,
  ACCOUNT_NOT_FOUND: ERROR_CODES.NOT_FOUND,
  ORDER_NOT_FOUND: ERROR_CODES.ORDER_NOT_FOUND,
  HOLDING_NOT_FOUND: ERROR_CODES.HOLDING_NOT_FOUND,
  RESERVATION_NOT_FOUND: ERROR_CODES.RESERVATION_NOT_FOUND,
  INSUFFICIENT_CASH_BALANCE: ERROR_CODES.INSUFFICIENT_BALANCE,
  INSUFFICIENT_AVAILABLE_BALANCE: ERROR_CODES.INSUFFICIENT_BALANCE,
  INSUFFICIENT_LOCKED_BALANCE: ERROR_CODES.INSUFFICIENT_BALANCE,
  INSUFFICIENT_HOLDING: ERROR_CODES.INSUFFICIENT_HOLDING,
  IDEMPOTENCY_KEY_INVALID: ERROR_CODES.IDEMPOTENCY_KEY_INVALID,
};

export function grpcToHttpStatus(code: number): number {
  return STATUS_MAP[code] ?? 500;
}

export function mapGrpcError(err: unknown, traceId?: string): PublicErrorResponse {
  if (!(err instanceof ClientError)) {
    console.error('[grpc] unexpected non-ClientError:', err);
    return buildErrorResponse({
      statusCode: 503,
      code: ERROR_CODES.UPSTREAM_UNAVAILABLE,
      traceId,
    });
  }

  const statusCode = grpcToHttpStatus(err.code);
  if (statusCode >= 500) {
    console.error('[grpc] upstream server error:', err);
    return buildErrorResponse({
      statusCode,
      code: statusCode === 503 || statusCode === 504 ? ERROR_CODES.UPSTREAM_UNAVAILABLE : ERROR_CODES.INTERNAL_ERROR,
      traceId,
    });
  }

  const upstreamCode = extractGrpcMetadata(err, 'x-error-code') ?? codeLike(err.details);
  const upstreamMessage = extractGrpcMetadata(err, 'x-error-message');
  const code = upstreamCode ? UPSTREAM_CODE_MAP[upstreamCode] ?? fallbackCodeByStatus(statusCode) : fallbackCodeByStatus(statusCode);

  return buildErrorResponse({
    statusCode,
    code,
    message: upstreamMessage,
    traceId: traceId ?? extractGrpcMetadata(err, 'x-trace-id') ?? undefined,
  });
}

function fallbackCodeByStatus(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400:
      return ERROR_CODES.BAD_REQUEST;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 422:
      return ERROR_CODES.VALIDATION_FAILED;
    case 503:
    case 504:
      return ERROR_CODES.UPSTREAM_UNAVAILABLE;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
}

function codeLike(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^[A-Z][A-Z0-9_]{2,}$/.test(value) ? value : undefined;
}

function extractGrpcMetadata(err: ClientError, key: string): string | undefined {
  const unknownErr = err as unknown as {
    metadata?: unknown;
    trailer?: unknown;
    trailers?: unknown;
    responseMetadata?: unknown;
  };
  return readMetadataValue(unknownErr.metadata, key)
    ?? readMetadataValue(unknownErr.trailer, key)
    ?? readMetadataValue(unknownErr.trailers, key)
    ?? readMetadataValue(unknownErr.responseMetadata, key);
}

function readMetadataValue(metadata: unknown, key: string): string | undefined {
  if (!metadata) return undefined;
  if (typeof metadata === 'object' && 'get' in metadata && typeof metadata.get === 'function') {
    const value = metadata.get(key);
    if (Array.isArray(value)) return stringify(value[0]);
    return stringify(value);
  }
  if (metadata instanceof Map) {
    const value = metadata.get(key);
    if (Array.isArray(value)) return stringify(value[0]);
    return stringify(value);
  }
  if (typeof metadata === 'object' && key in metadata) {
    const value = (metadata as Record<string, unknown>)[key];
    if (Array.isArray(value)) return stringify(value[0]);
    return stringify(value);
  }
  return undefined;
}

function stringify(value: unknown): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'string' ? value : String(value);
}
