import { getMyProfile, getMyPageSummary } from '@/apis/users';
import { getAccountBalance } from '@/apis/account';
import type { OAuthLoginResult } from '@/lib/api-types';

type SetSession = (result: OAuthLoginResult) => void;
type SetAccountSummary = (input: { cash: number; rank: number }) => void;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function setSessionWithServerProfile(
  result: OAuthLoginResult,
  setSession: SetSession,
  setAccountSummary?: SetAccountSummary,
): Promise<void> {
  setSession(result);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const profile = await getMyProfile();
      setSession({ ...result, user: { ...result.user, ...profile } });
      break;
    } catch {
      // 프로필 재시도가 전부 실패해도 아래 잔고/랭킹 조회는 계속 진행한다.
      if (attempt < 3) await delay(250);
    }
  }

  if (!setAccountSummary) return;
  try {
    const [balance, summary] = await Promise.all([getAccountBalance(), getMyPageSummary()]);
    // ranking 은 Optional — 랭킹 산정 전(신규 유저 등)에는 없을 수 있다.
    setAccountSummary({ cash: balance.availableAmount, rank: summary.ranking?.rank ?? 0 });
  } catch {
    // 잔고/랭킹 조회 실패는 로그인 자체를 막지 않는다 — 다음 진입 시 재조회.
  }
}