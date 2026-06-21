'use client';
import { useRef } from 'react';
import { clearIdempotencyKey, newIdempotencyKey, resolveIdempotencyKey } from '@/lib/idempotency';

export interface UseIdempotencyKeyOptions {
  /**
   * 영속 슬롯 식별자. 주면 localStorage에 저장돼 **앱 재시작 후에도 같은 키를 복구**한다
   * (스펙 §1 "재시작 후 재전송에는 같은 키"). 생략하면 메모리(ref)에만 산다.
   *
   * 한 번에 하나의 의도면 `'place-order'`처럼 고정값으로 충분하고, 대상 구분이 필요하면
   * `place-order:${symbol}`처럼 구체화한다. 같은 scope를 쓰는 호출은 키를 공유한다.
   */
  scope?: string;
  /**
   * 의도 내용 지문(payload). 바뀌면 같은 scope여도 **새 키를 만든다**
   * (스펙 §1 "수량·가격 등 의도가 바뀌면 새 키"). 예: `JSON.stringify({ symbol, qty, price })`.
   * 생략하면 scope만으로 키를 고정한다.
   */
  signature?: string;
}

export interface UseIdempotencyKey {
  /** 현재 의도의 키를 반환한다. reset/의도 변경 전까지 같은 값을 돌려준다. */
  get: () => string;
  /** 의도 완료(성공) 후 호출 → 메모리/영속 슬롯을 비워 다음 의도용 키를 새로 만들게 한다. */
  reset: () => void;
}

/**
 * 한 "사용자 의도"에 고정된 멱등성 키를 제공한다 (이중탭·재전송·앱 재시작 방어).
 *
 * 사용 패턴 (영속 + 의도 지문):
 *   const orderKey = useIdempotencyKey({
 *     scope: 'place-order',
 *     signature: JSON.stringify({ symbol, quantity, price }),
 *   });
 *   async function submit() {
 *     await placeOrder(input, orderKey.get()); // 재시도·이중탭·재시작 = 같은 키
 *     orderKey.reset();                          // 성공 후 슬롯 비움
 *   }
 *
 * - scope 미지정: 메모리 키(이중탭·in-flight 재시도만 방어).
 * - scope 지정: localStorage 영속 → 앱 재시작 후 재제출도 같은 키.
 * - signature 변경: 같은 scope여도 새 키 → 의도가 바뀌면(수량·가격) 새 명령으로 처리.
 *
 * 행(row)별 동적 대상(주문 id 등)에는 hook 대신 `resolveIdempotencyKey(scope, signature)`를 직접 쓴다.
 */
export function useIdempotencyKey(options: UseIdempotencyKeyOptions = {}): UseIdempotencyKey {
  const { scope, signature } = options;

  // 메모리 캐시(현재 의도의 키). storage 쓰기가 실패해도 세션 내 같은 키를 보장한다.
  // ref는 렌더 중 접근하지 않고 get/reset(이벤트 핸들러)에서만 읽고 쓴다.
  const memRef = useRef<{ key: string; signature?: string } | null>(null);

  // get/reset은 렌더 클로저의 최신 scope/signature를 캡처한다(매 렌더 새 함수 — 이벤트 핸들러용이라 안전).
  const get = () => {
    // 같은 의도(signature 동일)면 메모리 캐시 우선 — storage 가용 여부와 무관하게 안정.
    if (memRef.current && memRef.current.signature === signature) return memRef.current.key;

    const key = scope ? resolveIdempotencyKey(scope, signature) : newIdempotencyKey();
    memRef.current = { key, signature };
    return key;
  };

  const reset = () => {
    memRef.current = null;
    if (scope) clearIdempotencyKey(scope);
  };

  return { get, reset };
}
