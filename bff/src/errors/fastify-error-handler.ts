import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { IdempotencyKeyError } from '../grpc/idempotency/key';
import { ERROR_CODES } from './error-codes';
import { buildErrorResponse } from './error-response';
import { PublicError } from './public-error';

export function handleError(error: FastifyError | Error, req: FastifyRequest, reply: FastifyReply) {
  const traceId = req.id;

  if (error instanceof PublicError) {
    return reply.status(error.statusCode).send(
      buildErrorResponse({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        traceId,
      }),
    );
  }

  if (error instanceof IdempotencyKeyError) {
    return reply.status(error.statusCode).send(
      buildErrorResponse({
        statusCode: error.statusCode,
        code: ERROR_CODES.IDEMPOTENCY_KEY_INVALID,
        traceId,
      }),
    );
  }

  if ('validation' in error && error.validation) {
    return reply.status(400).send(
      buildErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.VALIDATION_FAILED,
        traceId,
      }),
    );
  }

  // Fastify가 던지는 4xx(빈 body·미지원 content-type 등)는 원래 상태코드를 보존한다.
  // 이 분기가 없으면 400/415가 아래 fallback에서 500(INTERNAL_ERROR)으로 오인 전달된다.
  const fastifyStatus = (error as FastifyError).statusCode;
  if (typeof fastifyStatus === 'number' && fastifyStatus >= 400 && fastifyStatus < 500) {
    return reply.status(fastifyStatus).send(
      buildErrorResponse({
        statusCode: fastifyStatus,
        code: ERROR_CODES.BAD_REQUEST,
        traceId,
      }),
    );
  }

  req.log.error({ err: error, traceId }, 'Unhandled BFF error');
  return reply.status(500).send(
    buildErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      traceId,
    }),
  );
}
