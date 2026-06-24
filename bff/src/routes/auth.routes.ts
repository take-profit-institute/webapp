import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { demoUser } from '../data/user';
import {
  AuthResponse,
  AuthTokens,
  ErrorResponse,
  LoginBody,
  LogoutBody,
  OAuthLoginQuery,
  OAuthLoginResult,
  ProviderInfo,
  ProviderParams,
  RefreshTokenBody,
  RefreshTokenResult,
  SignupBody,
  TokenValidateBody,
  TokenValidateResult,
  UpdateProfileBody,
  UserProfile,
} from '@candle/shared';
import type {
  AuthTokens as AuthTokensType,
  OAuthProvider,
  UserProfile as UserProfileType,
  UserRole,
} from '@candle/shared';
import { mapGrpcError } from '../grpc/error-mapper';

const PROVIDER_META: Record<string, { name: string; color: string }> = {
  google: { name: 'Google', color: '#4285F4' },
  kakao: { name: '카카오', color: '#FEE500' },
  naver: { name: '네이버', color: '#03C75A' },
};

// ── Token helpers ──────────────────────────────────────────────────
// NOTE: tokens are MOCK. A real Auth Service signs JWTs with a secret (AUTH-015/016);
// here we base64url-encode an unsigned payload so the shape and `exp` are realistic.
const ACCESS_TTL = 60 * 60; // 1h
const REFRESH_TTL = 60 * 60 * 24 * 14; // 14d

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function issueAccessToken(userId: string, role: UserRole): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({ sub: userId, role, iat: now, exp: now + ACCESS_TTL });
  return `${header}.${payload}.mock-signature`;
}

function issueTokens(userId: string, role: UserRole): AuthTokensType {
  return {
    accessToken: issueAccessToken(userId, role),
    refreshToken: `refresh.${b64url({ sub: userId, jti: Date.now() })}`,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL,
    refreshExpiresIn: REFRESH_TTL,
  };
}

function decodeAccessToken(token: string): { sub?: string; role?: UserRole; exp?: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/** Legacy mock token for the email/password endpoints. */
function issueToken(userId: string): string {
  return `mock.${Buffer.from(userId).toString('base64url')}.${Date.now()}`;
}

const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // ── OAuth (AUTH-001~006) ─────────────────────────────────────────
  app.get(
    '/providers',
    {
      schema: {
        tags: ['auth'],
        summary: '지원 OAuth Provider 목록',
        response: { 200: Type.Array(ProviderInfo), 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      try {
        const res = await req.server.grpc.auth.listProviders({});
        return res.providers.map((p) => ({
          id: p.name as OAuthProvider,
          authorizationUrl: p.authorizationUrl,
          ...(PROVIDER_META[p.name] ?? { name: p.name, color: '#888888' }),
        }));
      } catch (err) {
        const { statusCode, message } = mapGrpcError(err);
        const httpStatus = (statusCode === 500 ? 500 : 503) as 500 | 503;
        return reply.code(httpStatus).send({ statusCode: httpStatus, error: 'gRPC Error', message });
      }
    },
  );

  app.post(
    '/oauth/:provider',
    {
      schema: {
        tags: ['auth'],
        summary: 'OAuth 로그인/자동 회원가입 (mock)',
        params: ProviderParams,
        querystring: OAuthLoginQuery,
        response: { 200: OAuthLoginResult, 403: ErrorResponse },
      },
    },
    async (req, reply) => {
      const { provider } = req.params;
      const scenario = req.query.as ?? 'existing';

      // AUTH-014 / USER-006: 정지·탈퇴 사용자는 로그인 거부.
      if (scenario === 'suspended' || scenario === 'withdrawn') {
        const message =
          scenario === 'withdrawn' ? '탈퇴한 계정입니다. 로그인할 수 없습니다.' : '정지된 계정입니다. 로그인할 수 없습니다.';
        return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message });
      }

      const isNewUser = scenario === 'new';
      const user: UserProfileType = isNewUser
        ? {
            id: `u_${Date.now()}`,
            username: '신규투자자',
            email: `new_${Date.now()}@candle.app`,
            avatar: '🐯',
            role: 'USER',
            status: 'active',
            provider,
            createdAt: new Date().toISOString(),
          }
        : { ...demoUser, provider };

      return { tokens: issueTokens(user.id, user.role), user, isNewUser };
    },
  );

  // ── Token lifecycle (AUTH-007~010) ───────────────────────────────
  app.post(
    '/token/refresh',
    { schema: { tags: ['auth'], summary: 'Access Token 재발급', body: RefreshTokenBody, response: { 200: RefreshTokenResult, 401: ErrorResponse } } },
    async (req, reply) => {
      // AUTH-009: 폐기/유효하지 않은 Refresh Token은 거부.
      if (!req.body.refreshToken.startsWith('refresh.')) {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: '유효하지 않은 Refresh Token입니다.' });
      }
      return { accessToken: issueAccessToken(demoUser.id, demoUser.role), tokenType: 'Bearer' as const, expiresIn: ACCESS_TTL };
    },
  );

  app.post(
    '/token/validate',
    { schema: { tags: ['auth'], summary: 'JWT 유효성 검증', body: TokenValidateBody, response: { 200: TokenValidateResult } } },
    async (req) => {
      const decoded = decodeAccessToken(req.body.token);
      const now = Math.floor(Date.now() / 1000);
      const valid = !!decoded && typeof decoded.exp === 'number' && decoded.exp > now;
      return {
        valid,
        role: decoded?.role,
        expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : undefined,
      };
    },
  );

  app.post(
    '/logout',
    { schema: { tags: ['auth'], summary: '로그아웃 (Refresh Token 폐기)', body: LogoutBody, response: { 204: Type.Null() } } },
    // NOTE: mock — a real service revokes the refresh token server-side (AUTH-010).
    async (_req, reply) => reply.status(204).send(null),
  );

  // ── Current user / profile ───────────────────────────────────────
  app.get(
    '/me',
    { schema: { tags: ['auth'], summary: '현재 사용자', response: { 200: UserProfile } } },
    async () => demoUser,
  );

  app.patch(
    '/me',
    { schema: { tags: ['auth'], summary: '프로필 수정', body: UpdateProfileBody, response: { 200: UserProfile } } },
    // NOTE: not persisted — merges the patch onto the demo user and echoes it back.
    async (req) => ({ ...demoUser, ...req.body }),
  );

  app.delete(
    '/me',
    { schema: { tags: ['auth'], summary: '계정 삭제', response: { 204: Type.Null() } } },
    // NOTE: mock — no-op. A real service would revoke the session and delete the user.
    async (_req, reply) => reply.status(204).send(null),
  );

  // ── Legacy email/password (not in the OAuth requirements; kept for dev) ──
  app.post(
    '/signup',
    { schema: { tags: ['auth'], summary: '회원가입 (legacy)', body: SignupBody, response: { 201: AuthResponse } } },
    async (req, reply) => {
      const user: UserProfileType = {
        id: `u_${Date.now()}`,
        username: req.body.username,
        email: req.body.email,
        avatar: '🐯',
        role: 'USER',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      return reply.status(201).send({ token: issueToken(user.id), user });
    },
  );

  app.post(
    '/login',
    { schema: { tags: ['auth'], summary: '로그인 (legacy)', body: LoginBody, response: { 200: AuthResponse } } },
    async (req) => ({ token: issueToken(demoUser.id), user: { ...demoUser, email: req.body.email } }),
  );
};

export default authRoutes;
