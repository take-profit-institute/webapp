/**
 * 멱등성 키 팩토리 (프론트 = 의도 주체).
 *
 * 책임 분리 (BFF `grpc/idempotency`와 짝):
 *   - 프론트(여기): 사용자 의도마다 UUIDv7 키 생성. 재시도·재전송에는 같은 키 재사용.
 *   - BFF: Idempotency-Key 헤더 검증 → gRPC metadata/command_metadata로 전파.
 *   - 소유 서비스: 같은 키에 같은 결과 보장(재생) 또는 단 한 번 실행.
 *
 * 키는 의도가 바뀌면(수량·가격 등) 새로 만들고, 같은 의도의 재시도에는 그대로 둔다.
 */

/** 쓰기 요청에 키를 싣는 HTTP 헤더 이름. BFF가 검증한다. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

/** crypto.getRandomValues 우선, 없으면 Math.random 폴백(비보안 컨텍스트 최후수단). */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function formatUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i += 1) hex.push(bytes[i].toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/**
 * 새 멱등성 키(UUIDv7)를 만든다. 시간순 정렬이 가능해 서버 인덱스/디버깅에 유리하다.
 *
 * 한 번의 사용자 의도마다 호출하고, 그 의도의 모든 재시도에는 같은 값을 재사용한다.
 * 매 네트워크 호출마다 새로 만들면 재시도가 다른 키가 되어 멱등성이 깨진다.
 */
export function newIdempotencyKey(): string {
  const bytes = randomBytes(16);
  const ts = Date.now();
  const tsHigh = Math.floor(ts / 2 ** 32); // 상위 16비트
  const tsLow = ts >>> 0; // 하위 32비트
  bytes[0] = (tsHigh >>> 8) & 0xff;
  bytes[1] = tsHigh & 0xff;
  bytes[2] = (tsLow >>> 24) & 0xff;
  bytes[3] = (tsLow >>> 16) & 0xff;
  bytes[4] = (tsLow >>> 8) & 0xff;
  bytes[5] = tsLow & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return formatUuid(bytes);
}
