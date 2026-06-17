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

/** Authorization role (AUTH-011). */
export const UserRole = Type.Union([Type.Literal('USER'), Type.Literal('ADMIN')]);
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
