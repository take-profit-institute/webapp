/** Authentication endpoints (`/api/auth/*`). Mocked on the BFF for now. */
import type {
  AuthResponse,
  OAuthLoginResult,
  OAuthProvider,
  ProviderInfo,
  RefreshTokenResult,
  TokenValidateResult,
  UpdateProfileBody,
  UserProfile,
} from '@/lib/api-types';
import { apiClient } from './client';

// ── OAuth (AUTH-001~006) ───────────────────────────────────────────

/** 지원 OAuth Provider 목록 (Google/Kakao/Naver). */
export function getProviders(): Promise<ProviderInfo[]> {
  return apiClient.get<ProviderInfo[]>('/api/auth/providers');
}

/**
 * OAuth 로그인 / 자동 회원가입.
 * `as`는 mock 전용 시나리오 셀렉터(신규 가입·정지 계정 경로 시연용).
 */
export function oauthLogin(
  provider: OAuthProvider,
  as?: 'existing' | 'new' | 'suspended',
): Promise<OAuthLoginResult> {
  return apiClient.post<OAuthLoginResult>(`/api/auth/oauth/${provider}`, undefined, { as });
}

// ── Token lifecycle (AUTH-007~010) ─────────────────────────────────

/** Access Token 재발급. */
export function refreshToken(token: string): Promise<RefreshTokenResult> {
  return apiClient.post<RefreshTokenResult>('/api/auth/token/refresh', { refreshToken: token });
}

/** JWT 유효성 검증. */
export function validateToken(token: string): Promise<TokenValidateResult> {
  return apiClient.post<TokenValidateResult>('/api/auth/token/validate', { token });
}

/** 로그아웃 — Refresh Token 폐기 요청. */
export function logout(refreshToken?: string): Promise<void> {
  return apiClient.post<void>('/api/auth/logout', { refreshToken });
}

// ── Current user / profile ─────────────────────────────────────────

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

// ── Legacy email/password (dev only) ───────────────────────────────
export interface LoginInput {
  email: string;
  password: string;
}
export interface SignupInput {
  username: string;
  email: string;
  password: string;
}

/** 로그인 (legacy). */
export function login(input: LoginInput): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/auth/login', input);
}

/** 회원가입 (legacy). */
export function signup(input: SignupInput): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/auth/signup', input);
}
