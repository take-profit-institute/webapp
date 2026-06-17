/** User Service endpoints (`/api/users/*`) — 회원/프로필/마이페이지. */
import type {
  MyPageSummary,
  NicknameCheckResult,
  UpdateProfileBody,
  UserProfile,
} from '@/lib/api-types';
import { apiClient } from './client';

/** 사용자 정보 조회 (USER-002). */
export function getMyProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/api/users/me');
}

/** 프로필 수정 — 닉네임/이미지/투자성향 (USER-003/008/010). */
export function updateMyProfile(input: UpdateProfileBody): Promise<UserProfile> {
  return apiClient.patch<UserProfile>('/api/users/me', input);
}

/** 닉네임 중복 검사 (USER-009). */
export function checkNickname(nickname: string): Promise<NicknameCheckResult> {
  return apiClient.get<NicknameCheckResult>('/api/users/nickname/check', { nickname });
}

/** 회원 탈퇴 (USER-004). */
export function withdraw(): Promise<UserProfile> {
  return apiClient.post<UserProfile>('/api/users/me/withdraw');
}

/** 마이페이지 집계 — 프로필+성과+자산+랭킹+챌린지 (USER-012~016). */
export function getMyPageSummary(): Promise<MyPageSummary> {
  return apiClient.get<MyPageSummary>('/api/users/me/summary');
}
