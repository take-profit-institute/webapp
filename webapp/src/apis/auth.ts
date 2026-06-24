/** Authentication endpoints (`/api/auth/*`). */
import type {
  AuthResponse,
  OAuthLoginResult,
  OAuthProvider,
  ProviderInfo,
  RefreshTokenResult,
  TokenValidateResult,
  UpdateProfileBody,
  UserProfile,
  UserRole,
} from '@/lib/api-types';
import { authApiClient } from './client';

// auth-service returns { providers: [{ name: "<id>", authorizationUrl: "..." }] }
// bff mock returns ProviderInfo[] directly — handle both shapes here.
const PROVIDER_META: Record<string, { name: string; color: string }> = {
  google: { name: 'Google', color: '#4285F4' },
  kakao: { name: '카카오', color: '#FEE500' },
  naver: { name: '네이버', color: '#03C75A' },
};

type AuthServiceProvidersResponse = { providers: { name: string; authorizationUrl: string }[] };

// auth-service POST /oauth/:provider 응답 (flat, user 없음)
type AuthServiceLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  isNewUser: boolean;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ── OAuth (AUTH-001~006) ───────────────────────────────────────────

/** 지원 OAuth Provider 목록 (Google/Kakao/Naver). */
export async function getProviders(): Promise<ProviderInfo[]> {
  const raw = await authApiClient.get<ProviderInfo[] | AuthServiceProvidersResponse>('/api/auth/providers');
  if (Array.isArray(raw)) return raw;
  return raw.providers.map(({ name: id, authorizationUrl }) => ({
    id: id as OAuthProvider,
    authorizationUrl,
    ...(PROVIDER_META[id] ?? { name: id, color: '#888888' }),
  }));
}

/**
 * OAuth 로그인 / 자동 회원가입.
 * `as`는 mock 전용 시나리오 셀렉터(신규 가입·정지 계정 경로 시연용).
 */
export function oauthLogin(
  provider: OAuthProvider,
  as?: 'existing' | 'new' | 'suspended',
): Promise<OAuthLoginResult> {
  return authApiClient.post<OAuthLoginResult>(`/api/auth/oauth/${provider}`, undefined, { as });
}

/**
 * 실제 OAuth 코드 교환 — 콜백 페이지가 Google에서 받은 `code`를 게이트웨이로 전달.
 * auth-service는 flat 응답을 반환하므로 OAuthLoginResult 형태로 변환한다.
 */
export async function oauthExchange(
  provider: OAuthProvider,
  authorizationCode: string,
): Promise<OAuthLoginResult> {
  const raw = await authApiClient.post<AuthServiceLoginResponse | OAuthLoginResult>(
    `/api/auth/oauth/${provider}`,
    { authorizationCode },
  );

  // BFF mock은 이미 OAuthLoginResult 형태 (tokens 필드 존재)
  if ('tokens' in raw) return raw as OAuthLoginResult;

  // auth-service 응답: flat — JWT에서 사용자 정보 추출
  const res = raw as AuthServiceLoginResponse;
  const jwt = decodeJwtPayload(res.accessToken) ?? {};

  return {
    tokens: {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      tokenType: 'Bearer',
      expiresIn: res.expiresIn,
      refreshExpiresIn: res.refreshExpiresIn,
    },
    user: {
      id: String(jwt['sub'] ?? ''),
      username: String(jwt['email'] ?? jwt['sub'] ?? '').split('@')[0],
      email: String(jwt['email'] ?? ''),
      avatar: '🎯',
      role: (String(jwt['role'] ?? 'USER')) as UserRole,
      status: 'active',
      provider,
      createdAt: jwt['iat'] ? new Date((jwt['iat'] as number) * 1000).toISOString() : new Date().toISOString(),
    },
    isNewUser: res.isNewUser,
  };
}

// ── Token lifecycle (AUTH-007~010) ─────────────────────────────────

/** Access Token 재발급. */
export function refreshToken(token: string): Promise<RefreshTokenResult> {
  return authApiClient.post<RefreshTokenResult>('/api/auth/token/refresh', { refreshToken: token });
}

/** JWT 유효성 검증. */
export function validateToken(token: string): Promise<TokenValidateResult> {
  return authApiClient.post<TokenValidateResult>('/api/auth/token/validate', { token });
}

/** 로그아웃 — Refresh Token 폐기 요청. */
export function logout(refreshToken?: string): Promise<void> {
  return authApiClient.post<void>('/api/auth/logout', { refreshToken });
}

// ── Current user / profile ─────────────────────────────────────────

/** 현재 사용자. */
export function getMe(): Promise<UserProfile> {
  return authApiClient.get<UserProfile>('/api/auth/me');
}

/** 프로필 수정 (닉네임/아바타/투자성향). */
export function updateProfile(input: UpdateProfileBody): Promise<UserProfile> {
  return authApiClient.patch<UserProfile>('/api/auth/me', input);
}

/** 계정 삭제. */
export function deleteAccount(): Promise<void> {
  return authApiClient.del('/api/auth/me');
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
  return authApiClient.post<AuthResponse>('/api/auth/login', input);
}

/** 회원가입 (legacy). */
export function signup(input: SignupInput): Promise<AuthResponse> {
  return authApiClient.post<AuthResponse>('/api/auth/signup', input);
}
