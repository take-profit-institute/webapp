/** Authentication endpoints (`/api/auth/*`). Mocked on the BFF for now. */
import type { AuthResponse, UserProfile } from '@/lib/api-types';
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
