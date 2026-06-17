/** Authentication endpoints (`/api/auth/*`). Mocked on the BFF for now. */
import type { AuthResponse, UpdateProfileBody, UserProfile } from '@/lib/api-types';
import { apiClient } from './client';

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
}

/** 로그인. */
export function login(input: LoginInput): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/auth/login', input);
}

/** 회원가입. */
export function signup(input: SignupInput): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/auth/signup', input);
}

/** 현재 사용자. */
export function getMe(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/api/auth/me');
}

/** 프로필 수정 (닉네임/아바타/투자성향). */
export function updateProfile(input: UpdateProfileBody): Promise<UserProfile> {
  return apiClient.patch<UserProfile>('/api/auth/me', input);
}

/** 계정 삭제. */
export function deleteAccount(): Promise<void> {
  return apiClient.del('/api/auth/me');
}

/** 로그아웃. */
export function logout(): Promise<void> {
  return apiClient.post<void>('/api/auth/logout');
}

/** 토큰 갱신. */
export function refresh(): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/auth/refresh');
}
