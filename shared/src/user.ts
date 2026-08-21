import { Type, type Static } from '@sinclair/typebox';

/** Investment style chosen at signup / editable on the profile page. */
export const InvestStyle = Type.Union(
  [
    Type.Literal('conservative'),
    Type.Literal('balanced'),
    Type.Literal('aggressive'),
    Type.Literal('momentum'),
  ],
);
export type InvestStyle = Static<typeof InvestStyle>;

/** Authorization role (AUTH-011). SUPER_ADMIN는 관리자 계정 관리까지 가능한 상위 등급. */
export const UserRole = Type.Union([Type.Literal('USER'), Type.Literal('ADMIN'), Type.Literal('SUPER_ADMIN')]);
export type UserRole = Static<typeof UserRole>;

/**
 * User account status, verified during login (AUTH-014).
 * The Auth Service checks this against the User Service before issuing tokens;
 * a non-`active` user is refused (BFF mock returns 403).
 */
export const UserStatus = Type.Union(
  [Type.Literal('active'), Type.Literal('suspended'), Type.Literal('withdrawn')],
);
export type UserStatus = Static<typeof UserStatus>;

/** Supported OAuth2.0 providers (AUTH-003). */
export const OAuthProvider = Type.Union(
  [Type.Literal('google'), Type.Literal('kakao'), Type.Literal('naver')],
);
export type OAuthProvider = Static<typeof OAuthProvider>;

export const UserProfile = Type.Object(
  {
    id: Type.String(),
    username: Type.String(),
    email: Type.String({ format: 'email' }),
    avatar: Type.String(),
    role: UserRole,
    status: UserStatus,
    provider: Type.Optional(OAuthProvider),
    investStyle: Type.Optional(InvestStyle),
    createdAt: Type.String({ format: 'date-time' }),
  },
);
export type UserProfile = Static<typeof UserProfile>;

/** Access + Refresh token pair issued on login (AUTH-005/006). */
export const AuthTokens = Type.Object(
  {
    accessToken: Type.String({ description: 'JWT access token (mock)' }),
    refreshToken: Type.String({ description: 'Refresh token (mock)' }),
    tokenType: Type.Literal('Bearer'),
    expiresIn: Type.Number({ description: 'Access token lifetime in seconds' }),
    refreshExpiresIn: Type.Number({ description: 'Refresh token lifetime in seconds' }),
  },
);
export type AuthTokens = Static<typeof AuthTokens>;

export const AuthResponse = Type.Object(
  {
    token: Type.String({ description: 'Bearer token (mock for now)' }),
    user: UserProfile,
  },
);
export type AuthResponse = Static<typeof AuthResponse>;

// ── OAuth login (AUTH-001~006) ─────────────────────────────────────
export const ProviderParams = Type.Object({ provider: OAuthProvider });
export type ProviderParams = Static<typeof ProviderParams>;

/** Display metadata for a login provider button (AUTH-003). */
export const ProviderInfo = Type.Object(
  {
    id: OAuthProvider,
    name: Type.String(),
    color: Type.String({ description: 'Brand color for the button' }),
    authorizationUrl: Type.Optional(Type.String({ description: 'Real OAuth authorization URL; absent in mock mode' })),
  },
);
export type ProviderInfo = Static<typeof ProviderInfo>;

/**
 * Mock-only scenario selector. Real OAuth derives this from the provider callback;
 * here it lets the demo exercise the new-user (AUTH-002) and suspended (AUTH-014) paths.
 */
export const OAuthLoginQuery = Type.Object({
  as: Type.Optional(
    Type.Union([
      Type.Literal('existing'),
      Type.Literal('new'),
      Type.Literal('suspended'),
      Type.Literal('withdrawn'),
    ]),
  ),
});
export type OAuthLoginQuery = Static<typeof OAuthLoginQuery>;

export const OAuthLoginResult = Type.Object(
  {
    tokens: AuthTokens,
    user: UserProfile,
    isNewUser: Type.Boolean({ description: 'True when the Auth Service auto-created the user (AUTH-002/004)' }),
  },
);
export type OAuthLoginResult = Static<typeof OAuthLoginResult>;

// ── Token lifecycle (AUTH-007~010) ─────────────────────────────────
export const RefreshTokenBody = Type.Object({ refreshToken: Type.String() });
export type RefreshTokenBody = Static<typeof RefreshTokenBody>;

export const RefreshTokenResult = Type.Object(
  {
    accessToken: Type.String(),
    tokenType: Type.Literal('Bearer'),
    expiresIn: Type.Number(),
    // auth-service 는 refresh 회전(rotate) 시 새 refresh_token 을 함께 내려준다.
    // (BFF mock 은 생략 가능) 클라이언트는 있으면 보안 저장소에 재저장한다.
    refreshToken: Type.Optional(Type.String()),
  },
);
export type RefreshTokenResult = Static<typeof RefreshTokenResult>;

export const LogoutBody = Type.Object({
  refreshToken: Type.Optional(Type.String({ description: 'Token to revoke (AUTH-010)' })),
});
export type LogoutBody = Static<typeof LogoutBody>;

export const TokenValidateBody = Type.Object({ token: Type.String() });
export type TokenValidateBody = Static<typeof TokenValidateBody>;

export const TokenValidateResult = Type.Object(
  {
    valid: Type.Boolean(),
    role: Type.Optional(UserRole),
    expiresAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
);
export type TokenValidateResult = Static<typeof TokenValidateResult>;

// ── User Service: profile / nickname / mypage (USER-*) ─────────────
/** 닉네임 중복 검사 (USER-009). */
export const NicknameCheckQuery = Type.Object({
  nickname: Type.String({ minLength: 2, maxLength: 20 }),
});
export type NicknameCheckQuery = Static<typeof NicknameCheckQuery>;

export const NicknameCheckResult = Type.Object({
  nickname: Type.String(),
  available: Type.Boolean(),
});
export type NicknameCheckResult = Static<typeof NicknameCheckResult>;

/**
 * 마이페이지 집계 (USER-012~016).
 * BFF가 User·Account·Ranking·Mission 서비스 결과를 합성한 read 모델.
 */
export const MyPageSummary = Type.Object(
  {
    profile: UserProfile, // USER-012, 이메일(USER-011), 가입일(USER-022)
    performance: Type.Object({
      // USER-013 누적 수익률
      totalReturnPercent: Type.Number(),
      totalProfitLoss: Type.Number(),
    }),
    assets: Type.Object({
      // USER-014 자산 현황
      totalAsset: Type.Number(),
      cash: Type.Number(),
      investedAmount: Type.Number(),
    }),
    // USER-015 랭킹 (없을 수 있음)
    ranking: Type.Optional(Type.Object({ rank: Type.Number(), returnPercent: Type.Number() })),
    challenges: Type.Object({
      // USER-016 참여 중인 챌린지 현황
      active: Type.Number(),
      completed: Type.Number(),
    }),
  },
);
export type MyPageSummary = Static<typeof MyPageSummary>;

export const SignupBody = Type.Object({
  username: Type.String({ minLength: 2, maxLength: 20 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
});
export type SignupBody = Static<typeof SignupBody>;

export const LoginBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});
export type LoginBody = Static<typeof LoginBody>;

/** Partial profile update (PATCH /auth/me). All fields optional. */
export const UpdateProfileBody = Type.Object({
  username: Type.Optional(Type.String({ minLength: 2, maxLength: 20 })),
  avatar: Type.Optional(Type.String()),
  investStyle: Type.Optional(InvestStyle),
});
export type UpdateProfileBody = Static<typeof UpdateProfileBody>;

// ── Admin: User management (USER-019, USER-020) ────────────────────
/**
 * 관리자 콘솔 회원 목록의 계정 상태.
 *
 * `UserStatus`(active|suspended|withdrawn)를 쓰지 않는 이유: user-service의 `user_profiles`는
 * 탈퇴 여부(`deleted`)만 모델링한다. 정지(suspended)는 auth-service의 `admin_accounts` 쪽
 * 개념이라 일반 회원에는 대응하는 컬럼이 없다. 없는 상태를 계약에 넣어두면 필터를 걸었을 때
 * 조용히 0건이 나오므로, 실제로 표현 가능한 두 값만 노출한다.
 * 정지 기능을 붙이려면 `user_profiles`에 상태 컬럼을 먼저 추가해야 한다.
 */
export const AdminUserAccountStatus = Type.Union([Type.Literal('active'), Type.Literal('withdrawn')]);
export type AdminUserAccountStatus = Static<typeof AdminUserAccountStatus>;

/** 관리자 콘솔 회원 목록의 한 행. user-service `UserProfile` proto의 화면용 투영. */
export const AdminUserSummary = Type.Object({
  id: Type.String({ description: 'user_id' }),
  nickname: Type.String(),
  email: Type.String(),
  avatar: Type.String({ description: '프로필 이미지 URL 또는 이모지' }),
  status: AdminUserAccountStatus,
  createdAt: Type.String({ format: 'date-time', description: '가입일' }),
  updatedAt: Type.String({ format: 'date-time' }),
});
export type AdminUserSummary = Static<typeof AdminUserSummary>;

export const AdminUserListQuery = Type.Object({
  status: Type.Optional(AdminUserAccountStatus),
  q: Type.Optional(Type.String({ description: '닉네임/이메일 부분 검색' })),
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});
export type AdminUserListQuery = Static<typeof AdminUserListQuery>;

export const AdminUpdateUserStatusBody = Type.Object({
  status: UserStatus,
});
export type AdminUpdateUserStatusBody = Static<typeof AdminUpdateUserStatusBody>;

export const AdminUserIdParams = Type.Object({ id: Type.String() });
export type AdminUserIdParams = Static<typeof AdminUserIdParams>;
