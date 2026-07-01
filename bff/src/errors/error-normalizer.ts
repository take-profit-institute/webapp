import type { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES, type ErrorCode } from './error-codes';
import { ERROR_MESSAGES } from './error-messages';
import { httpErrorName } from './http-status';

interface ErrorLikePayload {
  statusCode?: unknown;
  error?: unknown;
  code?: unknown;
  message?: unknown;
  traceId?: unknown;
}

export function normalizeErrorPayload(
  req: FastifyRequest,
  reply: FastifyReply,
  payload: unknown,
): unknown {
  if (!isErrorLikePayload(payload)) return payload;

  const statusCode = Number(payload.statusCode);
  if (!Number.isInteger(statusCode) || statusCode < 400) return payload;

  const existingCode = typeof payload.code === 'string' && payload.code ? payload.code : undefined;
  const code = normalizeCode(existingCode, statusCode);
  const internal = statusCode >= 500;

  if (internal) {
    req.log.error({ errPayload: payload, traceId: req.id }, 'Internal error payload sanitized');
  }

  return {
    statusCode,
    error: httpErrorName(statusCode),
    code,
    message: internal ? ERROR_MESSAGES[code] : safeMessage(payload.message, code),
    traceId: typeof payload.traceId === 'string' && payload.traceId ? payload.traceId : req.id,
  };
}

function isErrorLikePayload(payload: unknown): payload is ErrorLikePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'statusCode' in payload &&
    'message' in payload
  );
}

function normalizeCode(code: string | undefined, statusCode: number): ErrorCode {
  if (code && Object.values(ERROR_CODES).includes(code as ErrorCode)) {
    return code as ErrorCode;
  }
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

function safeMessage(message: unknown, code: ErrorCode): string {
  return typeof message === 'string' && message.trim() ? message : ERROR_MESSAGES[code];
}
