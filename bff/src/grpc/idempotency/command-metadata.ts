import type { GrpcCallOptions } from '../types';

/**
 * `candle.common.v1.CommandMetadata`의 BFF 측 미러.
 * nice-grpc 코드젠이 들어오면 생성된 proto 타입으로 교체한다.
 */
export interface CommandMetadata {
  idempotencyKey: string;
  /** 의미 없는 값 — 서버 request hash에서 제외된다 (스펙 §3). */
  requestId?: string;
}

/** command metadata를 갖는 쓰기 요청 메시지 (모든 쓰기 proto가 가진다, 스펙 §2). */
export interface HasCommandMetadata {
  commandMetadata?: CommandMetadata;
}

/** 단일 소스(call options)로부터 command_metadata 서브메시지를 만든다. */
export function buildCommandMetadata(opts: GrpcCallOptions): CommandMetadata {
  if (!opts.idempotencyKey) {
    throw new Error(
      'buildCommandMetadata: 쓰기 명령에는 opts.idempotencyKey가 필요합니다',
    );
  }
  return { idempotencyKey: opts.idempotencyKey, requestId: opts.requestId };
}

/**
 * 쓰기 요청 본문에 command_metadata를 주입한다. 새 객체를 반환한다(원본 불변).
 *
 * 같은 opts.idempotencyKey가 idempotencyInterceptor를 통해 gRPC metadata로도
 * 흐르므로, metadata `x-idempotency-key`와 message `command_metadata.idempotency_key`가
 * 항상 일치한다 — 서버는 불일치를 INVALID_ARGUMENT로 거절한다 (스펙 §2).
 */
export function withCommandMetadata<T extends HasCommandMetadata>(
  req: T,
  opts: GrpcCallOptions,
): T {
  return { ...req, commandMetadata: buildCommandMetadata(opts) };
}
