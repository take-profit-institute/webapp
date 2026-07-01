import { ERROR_CODES, type ErrorCode } from './error-codes';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.BAD_REQUEST]: '요청 값을 확인해주세요.',
  [ERROR_CODES.VALIDATION_FAILED]: '입력값을 확인해주세요.',
  [ERROR_CODES.UNAUTHORIZED]: '로그인이 필요합니다.',
  [ERROR_CODES.FORBIDDEN]: '접근 권한이 없습니다.',
  [ERROR_CODES.NOT_FOUND]: '요청한 정보를 찾을 수 없습니다.',
  [ERROR_CODES.CONFLICT]: '이미 처리된 요청입니다.',
  [ERROR_CODES.IDEMPOTENCY_KEY_INVALID]: '요청 식별자가 올바르지 않습니다. 다시 시도해주세요.',

  [ERROR_CODES.USER_NOT_FOUND]: '사용자를 찾을 수 없습니다.',
  [ERROR_CODES.STOCK_NOT_FOUND]: '종목을 찾을 수 없습니다.',
  [ERROR_CODES.ORDER_NOT_FOUND]: '주문을 찾을 수 없습니다.',
  [ERROR_CODES.HOLDING_NOT_FOUND]: '보유 종목을 찾을 수 없습니다.',
  [ERROR_CODES.RESERVATION_NOT_FOUND]: '예약 주문을 찾을 수 없습니다.',
  [ERROR_CODES.MISSION_NOT_FOUND]: '미션을 찾을 수 없습니다.',
  [ERROR_CODES.CHALLENGE_NOT_FOUND]: '챌린지를 찾을 수 없습니다.',
  [ERROR_CODES.LEARN_CONTENT_NOT_FOUND]: '학습 콘텐츠를 찾을 수 없습니다.',
  [ERROR_CODES.NOTIFICATION_NOT_FOUND]: '알림을 찾을 수 없습니다.',
  [ERROR_CODES.INSUFFICIENT_BALANCE]: '주문 가능 금액이 부족합니다.',
  [ERROR_CODES.INSUFFICIENT_HOLDING]: '보유 수량을 초과할 수 없습니다.',
  [ERROR_CODES.WATCHLIST_ALREADY_EXISTS]: '이미 관심종목에 등록된 종목입니다.',
  [ERROR_CODES.WATCHLIST_LIMIT_EXCEEDED]: '관심종목은 최대 등록 개수를 초과할 수 없습니다.',
  [ERROR_CODES.WATCHLIST_NOT_FOUND]: '관심종목에 등록되지 않은 종목입니다.',

  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: '서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.',
  [ERROR_CODES.INTERNAL_ERROR]: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

export const ERROR_MESSAGE_FACTORIES = {
  watchlistLimitExceeded: (limit: number) => `관심종목은 최대 ${limit}개까지 등록할 수 있습니다.`,
  insufficientHolding: (quantity: number) => `보유 수량 ${quantity}주를 초과할 수 없습니다.`,
};
