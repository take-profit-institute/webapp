import type { ErrorResponse } from '@candle/shared';
import { type ErrorCode } from './error-codes';
import { ERROR_MESSAGES } from './error-messages';
import { httpErrorName } from './http-status';

export interface PublicErrorResponse extends ErrorResponse {
  code: ErrorCode;
}

export function buildErrorResponse(input: {
  statusCode: number;
  code: ErrorCode;
  message?: string;
  traceId?: string;
}): PublicErrorResponse {
  return {
    statusCode: input.statusCode,
    error: httpErrorName(input.statusCode),
    code: input.code,
    message: input.message ?? ERROR_MESSAGES[input.code],
    ...(input.traceId ? { traceId: input.traceId } : {}),
  };
}
