import type { UserProfile } from '@candle/shared';
import { DEMO_USER_ID } from './account';

/** The single demo user, owned by the (mock) User Service. */
export const demoUser: UserProfile = {
  id: DEMO_USER_ID,
  username: '박유빈',
  email: 'demo@candle.app',
  avatar: '🐯',
  role: 'USER',
  status: 'active',
  provider: 'google',
  investStyle: 'balanced',
  createdAt: '2026-01-02T09:00:00+09:00',
};

/** Nicknames already taken — used by the duplicate check (USER-009, mock). */
const takenNicknames = new Set(['투자왕', 'candle', '관리자', 'admin', '불개미킹', '황금손투자왕']);

export function isNicknameAvailable(nickname: string): boolean {
  // The user's own current nickname is considered available (no-op rename).
  if (nickname === demoUser.username) return true;
  return !takenNicknames.has(nickname);
}
