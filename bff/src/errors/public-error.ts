import { ERROR_MESSAGES } from './error-messages';
import type { ErrorCode } from './error-codes';

export class PublicError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message = ERROR_MESSAGES[code],
  ) {
    super(message);
    this.name = 'PublicError';
  }
}
