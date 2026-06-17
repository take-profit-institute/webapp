import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { DEMO_USER_ID } from '../data/account';
import { AuthResponse, LoginBody, SignupBody, UpdateProfileBody, UserProfile } from '@candle/shared';
import type { UserProfile as UserProfileType } from '@candle/shared';

const demoUser: UserProfileType = {
  id: DEMO_USER_ID,
  username: '박유빈',
  email: 'demo@candle.app',
  avatar: '🐯',
  investStyle: 'balanced',
  createdAt: '2026-01-02T09:00:00+09:00',
};

// NOTE: auth is mocked — no password hashing, no real tokens. Replace with a real
// auth service (JWT + user store) before launch.
function issueToken(userId: string): string {
  return `mock.${Buffer.from(userId).toString('base64url')}.${Date.now()}`;
}

const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/signup',
    { schema: { tags: ['auth'], summary: '회원가입', body: SignupBody, response: { 201: AuthResponse } } },
    async (req, reply) => {
      const user: UserProfileType = {
        id: `u_${Date.now()}`,
        username: req.body.username,
        email: req.body.email,
        avatar: '🐯',
        createdAt: new Date().toISOString(),
      };
      return reply.status(201).send({ token: issueToken(user.id), user });
    },
  );

  app.post(
    '/login',
    { schema: { tags: ['auth'], summary: '로그인', body: LoginBody, response: { 200: AuthResponse } } },
    async (req) => ({ token: issueToken(demoUser.id), user: { ...demoUser, email: req.body.email } }),
  );

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

  app.post(
    '/logout',
    { schema: { tags: ['auth'], summary: '로그아웃', response: { 204: Type.Null() } } },
    // NOTE: tokens are stateless mocks, so logout is a client-side no-op here.
    async (_req, reply) => reply.status(204).send(null),
  );

  app.post(
    '/refresh',
    { schema: { tags: ['auth'], summary: '토큰 갱신', response: { 200: AuthResponse } } },
    async () => ({ token: issueToken(demoUser.id), user: demoUser }),
  );
};

export default authRoutes;
