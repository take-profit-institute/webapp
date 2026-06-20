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

export const adminUser: UserProfile = {
  id: 'u_admin',
  username: '관리자',
  email: 'admin@candle.app',
  avatar: '🛡️',
  role: 'ADMIN',
  status: 'active',
  createdAt: '2026-01-01T00:00:00+09:00',
};

/** All users — used by admin endpoints. */
export const mockUsers: UserProfile[] = [
  demoUser,
  { id: 'u1', username: '황금손투자왕', email: 'u1@example.com', avatar: '👑', role: 'USER', status: 'active', provider: 'google', investStyle: 'aggressive', createdAt: '2026-01-05T10:00:00+09:00' },
  { id: 'u2', username: '불개미킹', email: 'u2@example.com', avatar: '🔥', role: 'USER', status: 'active', provider: 'kakao', investStyle: 'momentum', createdAt: '2026-01-08T14:00:00+09:00' },
  { id: 'u3', username: 'StockWhiz99', email: 'u3@example.com', avatar: '⚡', role: 'USER', status: 'active', provider: 'naver', investStyle: 'balanced', createdAt: '2026-01-12T09:30:00+09:00' },
  { id: 'u5', username: '주식의신', email: 'u5@example.com', avatar: '💎', role: 'USER', status: 'suspended', provider: 'google', investStyle: 'aggressive', createdAt: '2026-01-15T16:00:00+09:00' },
  { id: 'u6', username: '개미투자자', email: 'u6@example.com', avatar: '🌱', role: 'USER', status: 'active', provider: 'kakao', investStyle: 'conservative', createdAt: '2026-02-01T11:00:00+09:00' },
  { id: 'u7', username: 'TradeMaster', email: 'u7@example.com', avatar: '📈', role: 'USER', status: 'withdrawn', provider: 'google', investStyle: 'momentum', createdAt: '2026-02-10T08:00:00+09:00' },
  { id: 'u8', username: '시장분석가', email: 'u8@example.com', avatar: '🔭', role: 'USER', status: 'active', provider: 'naver', investStyle: 'balanced', createdAt: '2026-03-01T13:00:00+09:00' },
  { id: 'u9', username: '퀀트왕', email: 'u9@example.com', avatar: '🤖', role: 'USER', status: 'active', provider: 'google', investStyle: 'aggressive', createdAt: '2026-03-15T09:00:00+09:00' },
  { id: 'u10', username: '장기투자자', email: 'u10@example.com', avatar: '🏔', role: 'USER', status: 'active', provider: 'kakao', investStyle: 'conservative', createdAt: '2026-04-01T12:00:00+09:00' },
];

/** Nicknames already taken — used by the duplicate check (USER-009, mock). */
const takenNicknames = new Set(['투자왕', 'candle', '관리자', 'admin', '불개미킹', '황금손투자왕']);

export function isNicknameAvailable(nickname: string): boolean {
  if (nickname === demoUser.username) return true;
  return !takenNicknames.has(nickname);
}
