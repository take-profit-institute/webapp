import { createHash } from 'node:crypto';

/**
 * fan-out 명령용 결정론적 파생 키를 만든다
 * (1개의 HTTP 의도 → 여러 하위 gRPC 명령).
 *
 * 스펙 §2에 따라 원 키를 명령 간에 재사용하면 안 된다. 안정적인 파생 키는
 * 재시도 시에도 각 하위 명령의 멱등성을 유지한다. 출력은 canonical UUID
 * (RFC 4122 v5, SHA-1, 이름 기반)이며 `${parentKey}:${methodName}`로 계산하므로,
 * 같은 의도 + 같은 메서드는 항상 같은 키를 만든다.
 */
export function deriveIdempotencyKey(parentKey: string, methodName: string): string {
  const bytes = createHash('sha1')
    .update(`${parentKey}:${methodName}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
