import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { adminUser, mockUsers } from '../data/user';
import { learnContents, missions } from '../data/social';
import { DEMO_USER_ID } from '../data/account';
import {
  AdminLearnStats,
  AdminUpdateLearnVisibilityBody,
  AdminUpdateMissionRewardBody,
  AdminUpdateUserStatusBody,
  AdminUserIdParams,
  AdminUserListQuery,
  ErrorResponse,
  LearnContent,
  LearnIdParams,
  Mission,
  MissionCategory,
  MissionIdParams,
  MissionParticipant,
  MissionStats,
  OAuthLoginResult,
  Paginated,
  UserProfile,
} from '@candle/shared';

const ADMIN_EMAIL = 'admin@candle.app';
const ADMIN_PASSWORD = 'admin1234';
const ACCESS_TTL = 60 * 60;
const REFRESH_TTL = 60 * 60 * 24 * 14;

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function issueTokens(userId: string, role: 'USER' | 'ADMIN') {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({ sub: userId, role, iat: now, exp: now + ACCESS_TTL });
  return {
    accessToken: `${header}.${payload}.mock-signature`,
    refreshToken: `refresh.${b64url({ sub: userId, jti: Date.now() })}`,
    tokenType: 'Bearer' as const,
    expiresIn: ACCESS_TTL,
    refreshExpiresIn: REFRESH_TTL,
  };
}

function paginate<T>(arr: T[], page: number, limit: number) {
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return { items: arr.slice(start, start + limit), total, page: safePage, limit, totalPages };
}

const AdminLoginBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});

const LearnListQuery = Type.Object({
  published: Type.Optional(Type.Boolean()),
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

const MissionListQuery = Type.Object({
  category: Type.Optional(MissionCategory),
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export const adminRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // ── Auth ────────────────────────────────────────────────────────────
  app.post(
    '/login',
    { schema: { tags: ['admin'], summary: '관리자 로그인', body: AdminLoginBody, response: { 200: OAuthLoginResult, 401: ErrorResponse } } },
    async (req, reply) => {
      if (req.body.email !== ADMIN_EMAIL || req.body.password !== ADMIN_PASSWORD) {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: '관리자 계정 정보가 올바르지 않습니다.' });
      }
      return { tokens: issueTokens(adminUser.id, 'ADMIN'), user: adminUser, isNewUser: false };
    },
  );

  // ── Users (USER-019, USER-020) ──────────────────────────────────────
  app.get(
    '/users',
    {
      schema: {
        tags: ['admin'],
        summary: '사용자 목록 조회 (USER-019)',
        querystring: AdminUserListQuery,
        response: { 200: Paginated(UserProfile) },
      },
    },
    async (req) => {
      const { page = 1, limit = 20, status, q } = req.query;
      let result = [...mockUsers];
      if (status) result = result.filter((u) => u.status === status);
      if (q) {
        const lq = q.toLowerCase();
        result = result.filter((u) => u.username.toLowerCase().includes(lq) || u.email.toLowerCase().includes(lq));
      }
      return paginate(result, page, limit);
    },
  );

  app.patch(
    '/users/:id/status',
    { schema: { tags: ['admin'], summary: '사용자 상태 변경 (USER-020)', params: AdminUserIdParams, body: AdminUpdateUserStatusBody, response: { 200: UserProfile, 404: ErrorResponse } } },
    async (req, reply) => {
      const user = mockUsers.find((u) => u.id === req.params.id);
      if (!user) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `사용자를 찾을 수 없습니다: ${req.params.id}` });
      user.status = req.body.status;
      return user;
    },
  );

  // ── Learn (LEARN-014, LEARN-015) ────────────────────────────────────
  app.get(
    '/learn',
    {
      schema: {
        tags: ['admin'],
        summary: '전체 학습 콘텐츠 목록 (관리자)',
        querystring: LearnListQuery,
        response: { 200: Paginated(LearnContent) },
      },
    },
    async (req) => {
      const { page = 1, limit = 20, published } = req.query;
      let result = [...learnContents];
      if (published !== undefined) result = result.filter((c) => c.published === published);
      return paginate(result, page, limit);
    },
  );

  app.patch(
    '/learn/:id/visibility',
    { schema: { tags: ['admin'], summary: '콘텐츠 공개 설정 (LEARN-014)', params: LearnIdParams, body: AdminUpdateLearnVisibilityBody, response: { 200: LearnContent, 404: ErrorResponse } } },
    async (req, reply) => {
      const content = learnContents.find((c) => c.id === req.params.id);
      if (!content) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `콘텐츠를 찾을 수 없습니다: ${req.params.id}` });
      content.published = req.body.published;
      return content;
    },
  );

  app.get(
    '/learn/:id/stats',
    { schema: { tags: ['admin'], summary: '콘텐츠 조회 통계 (LEARN-015)', params: LearnIdParams, response: { 200: AdminLearnStats, 404: ErrorResponse } } },
    async (req, reply) => {
      const content = learnContents.find((c) => c.id === req.params.id);
      if (!content) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `콘텐츠를 찾을 수 없습니다: ${req.params.id}` });
      const completedCount = Math.round(content.readCount * 0.4);
      const favoriteCount = Math.round(content.readCount * 0.15);
      return {
        contentId: content.id,
        title: content.title,
        readCount: content.readCount,
        completedCount,
        completionRate: content.readCount ? Math.round((completedCount / content.readCount) * 100) : 0,
        favoriteCount,
      };
    },
  );

  // ── Missions (MISSION-018, MISSION-019, MISSION-020) ────────────────
  app.get(
    '/missions',
    {
      schema: {
        tags: ['admin'],
        summary: '전체 미션 목록 (관리자)',
        querystring: MissionListQuery,
        response: { 200: Paginated(Mission) },
      },
    },
    async (req) => {
      const { page = 1, limit = 20, category } = req.query;
      let result = [...missions];
      if (category) result = result.filter((m) => m.category === category);
      return paginate(result, page, limit);
    },
  );

  app.patch(
    '/missions/:id/reward',
    { schema: { tags: ['admin'], summary: '미션 보상 설정 (MISSION-019)', params: MissionIdParams, body: AdminUpdateMissionRewardBody, response: { 200: Mission, 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `미션을 찾을 수 없습니다: ${req.params.id}` });
      mission.reward = req.body.reward;
      if (req.body.badgeReward !== undefined) mission.badgeReward = req.body.badgeReward || undefined;
      if (req.body.achievementReward !== undefined) mission.achievementReward = req.body.achievementReward || undefined;
      return mission;
    },
  );

  app.get(
    '/missions/:id/participants',
    { schema: { tags: ['admin'], summary: '미션 참여자 조회 (MISSION-018)', params: MissionIdParams, response: { 200: Type.Array(MissionParticipant), 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `미션을 찾을 수 없습니다: ${req.params.id}` });
      if (!mission.joined) return [];
      return [{ userId: DEMO_USER_ID, username: '박유빈', missionId: mission.id, status: mission.status, progress: mission.progress, joinedAt: mission.joinedAt ?? new Date().toISOString() }];
    },
  );

  app.get(
    '/missions/:id/stats',
    { schema: { tags: ['admin'], summary: '미션 참여 통계 (MISSION-020)', params: MissionIdParams, response: { 200: MissionStats, 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `미션을 찾을 수 없습니다: ${req.params.id}` });
      const participants = mission.joined ? 1 : 0;
      const completed = mission.status === 'completed' ? 1 : 0;
      const failed = mission.status === 'failed' ? 1 : 0;
      return {
        missionId: mission.id,
        participants,
        completed,
        failed,
        completionRate: participants ? Math.round((completed / participants) * 100) : 0,
        totalRewardedPoints: mission.claimed ? mission.reward : 0,
      };
    },
  );
};
