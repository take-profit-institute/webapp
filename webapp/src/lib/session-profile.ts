import { getMyProfile } from '@/apis/users';
import type { OAuthLoginResult } from '@/lib/api-types';

type SetSession = (result: OAuthLoginResult) => void;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function setSessionWithServerProfile(
  result: OAuthLoginResult,
  setSession: SetSession,
): Promise<void> {
  setSession(result);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const profile = await getMyProfile();
      setSession({ ...result, user: { ...result.user, ...profile } });
      return;
    } catch {
      if (attempt === 3) return;
      await delay(250);
    }
  }
}
