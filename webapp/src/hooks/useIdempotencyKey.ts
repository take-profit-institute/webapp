'use client';
import { useCallback, useRef } from 'react';
import { newIdempotencyKey } from '@/lib/idempotency';

export interface UseIdempotencyKey {
  /** 현재 의도의 키를 반환한다. 처음 호출 시 생성하고, reset 전까지 같은 값을 돌려준다. */
  get: () => string;
  /** 의도 완료(성공) 후 호출 → 다음 의도용으로 키를 새로 만들게 한다. */
  reset: () => void;
}

/**
 * 한 "사용자 의도"에 고정된 멱등성 키를 제공한다 (이중탭·재전송 방어).
 *
 * 사용 패턴:
 *   const orderKey = useIdempotencyKey();
 *   async function submit() {
 *     await placeOrder(input, orderKey.get()); // 재시도·이중탭은 같은 키 → 서버가 한 번만 실행
 *     orderKey.reset();                          // 성공 후 다음 주문은 새 키
 *   }
 *
 * get()을 reset 없이 반복 호출하면 같은 키가 유지되므로, 네트워크 실패 후
 * 사용자가 다시 제출해도 동일 키가 전송된다. 입력(수량·가격)이 바뀌어 의도가
 * 달라지면 reset()으로 키를 새로 만든다.
 *
 * NOTE: 키는 메모리(ref)에만 산다. 앱 완전 재시작까지 같은 키를 보장하려면
 * 호출부에서 키를 storage에 영속화하는 변형이 필요하다(이중탭·in-flight 재시도는 이걸로 충분).
 */
export function useIdempotencyKey(): UseIdempotencyKey {
  const ref = useRef<string | null>(null);

  const get = useCallback(() => {
    if (ref.current === null) ref.current = newIdempotencyKey();
    return ref.current;
  }, []);

  const reset = useCallback(() => {
    ref.current = null;
  }, []);

  return { get, reset };
}
