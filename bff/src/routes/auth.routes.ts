import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { DEMO_USER_ID } from '../data/account';
import { AuthResponse, LoginBody, SignupBody, UserProfile } from '@candle/shared';
import type { UserProfile as UserProfileType } from '@candle/shared';

const demoUser: UserProfileType = {
  id: DEMO_USER_ID,
  username: '박유빈',
  email: 'demo@candle.app',
  avatar: '🐯',
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
};

export default authRoutes;
