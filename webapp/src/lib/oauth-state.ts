/**
 * OAuth CSRF state 관리 (프론트 전용).
 *
 * BFF/Gateway/auth-service는 stateless라 state를 저장하지 않는다. SPA에서 콜백을
 * 프론트가 직접 받으므로 CSRF 방지는 여기서 책임진다: authorize 전에 랜덤 state를
 * 생성해 sessionStorage에 저장하고, 콜백에서 돌아온 state와 비교해 일치할 때만 진행한다.
 * sessionStorage는 같은 탭의 외부 리다이렉트 왕복 동안 유지된다.
 *
 * naver는 토큰 교환에도 동일한 state를 요구하므로 콜백에서 검증 후 백엔드로 그대로 넘긴다.
 */
const KEY_PREFIX = 'oauth_state:';

function randomState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** 랜덤 state를 생성·저장하고 반환한다. authorize URL에 붙여 보낸다. */
export function createOAuthState(provider: string): string {
  const state = randomState();
  try {
    sessionStorage.setItem(KEY_PREFIX + provider, state);
  } catch {
    // sessionStorage 사용 불가 — state 검증 없이 진행(베스트 에포트)
  }
  return state;
}

/**
 * 콜백에서 돌아온 state를 검증하고 저장값을 소비(삭제)한다.
 * @returns 저장값과 일치하면 true
 */
export function consumeOAuthState(provider: string, returned: string | null): boolean {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(KEY_PREFIX + provider);
    sessionStorage.removeItem(KEY_PREFIX + provider);
  } catch {
    stored = null;
  }
  return !!returned && !!stored && returned === stored;
}
