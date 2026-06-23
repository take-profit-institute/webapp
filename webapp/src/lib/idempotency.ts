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

/** 영속 슬롯 prefix. */
const STORAGE_PREFIX = 'candle:idem:';

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

// ── 영속 키 (앱 재시작 후 재전송에 같은 키, 스펙 §1) ──────────────────────

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function readSlot(scope: string): { key: string; signature?: string } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + scope);
    return raw ? (JSON.parse(raw) as { key: string; signature?: string }) : null;
  } catch {
    return null;
  }
}

/**
 * scope에 고정된 영속 멱등성 키를 반환한다(없으면 생성·저장).
 *
 * - 같은 scope + 같은 signature → 저장된 키 재사용(앱 재시작 후 재전송 포함).
 * - signature가 바뀌면(수량·가격 등 의도 변경) 새 키로 교체(스펙 §1).
 * - storage 불가(프라이빗 모드 등) → 영속 없이 새 키. 세션 내 안정성은 호출부/훅의 메모리 캐시가 담당.
 *
 * React 컴포넌트에서는 보통 `useIdempotencyKey`를 쓰고, 행(row)별 동적 대상에는 이 함수를 직접 쓴다.
 */
export function resolveIdempotencyKey(scope: string, signature?: string): string {
  if (!canUseStorage()) return newIdempotencyKey();
  const saved = readSlot(scope);
  if (saved && saved.signature === signature) return saved.key;
  const key = newIdempotencyKey();
  try {
    window.localStorage.setItem(STORAGE_PREFIX + scope, JSON.stringify({ key, signature }));
  } catch {
    /* quota/프라이빗 모드 — 영속 실패해도 키는 반환 */
  }
  return key;
}

/** 영속 키 슬롯을 비운다. 의도 완료(성공) 후 호출 → 다음 의도는 새 키. */
export function clearIdempotencyKey(scope: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + scope);
  } catch {
    /* noop */
  }
}
