import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { adminUser, mockUsers } from '../data/user';
import { learnContents, missions } from '../data/social';
import { DEMO_USER_ID } from '../data/account';
import {
  AdminLearnStats,
  AdminUpdateLearnVisibilityBody,
  AdminUpsertLearnContentBody,
  AdminSendNotificationBody,
  AdminSendNotificationResult,
  AdminUpdateMissionRewardBody,
  AdminUpdateUserStatusBody,
  BatchExecution,
  BatchExecutionIdParams,
  BatchExecutionListQuery,
  BatchJob,
  BatchJobNameParams,
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
  Notification,
  OAuthLoginResult,
  Paginated,
  TriggerBatchJobBody,
  UserProfile,
} from '@candle/shared';
import { env } from '../config/env';
import { mapGrpcError, requireIdempotencyKey } from '../grpc';
import {
  grpcGetBatchExecution,
  grpcListBatchExecutions,
  grpcListBatchJobs,
  grpcTriggerBatchJob,
} from '../grpc/batch.grpc-client';
import {
  grpcAdminCreateContent,
  grpcAdminDeleteContent,
  grpcAdminListContents,
  grpcAdminSetContentVisibility,
  grpcAdminUpdateContent,
} from '../grpc/learning.grpc-client';

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

const EmptyResult = Type.Object({
  success: Type.Boolean(),
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

  // ── Batch control ──────────────────────────────────────────────────
  app.get(
    '/batch/jobs',
    {
      schema: {
        tags: ['admin'],
        summary: '배치 잡 목록 조회',
        response: { 200: Type.Array(BatchJob), 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      try {
        return await grpcListBatchJobs();
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode as 500 | 503).send(mapped);
      }
    },
  );

  app.post(
    '/batch/jobs/:jobName/trigger',
    {
      schema: {
        tags: ['admin'],
        summary: '배치 잡 수동 실행',
        params: BatchJobNameParams,
        body: TriggerBatchJobBody,
        response: {
          200: BatchExecution,
          400: ErrorResponse,
          409: ErrorResponse,
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req);
      try {
        return await grpcTriggerBatchJob(req.params.jobName, req.body.parameters ?? {}, idempotencyKey);
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode as 400 | 409 | 422 | 500 | 503).send(mapped);
      }
    },
  );

  app.get(
    '/batch/jobs/:jobName/executions',
    {
      schema: {
        tags: ['admin'],
        summary: '배치 잡 실행 이력 조회',
        params: BatchJobNameParams,
        querystring: BatchExecutionListQuery,
        response: { 200: Type.Array(BatchExecution), 400: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      try {
        return await grpcListBatchExecutions(req.params.jobName, req.query.limit ?? 20);
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode as 400 | 500 | 503).send(mapped);
      }
    },
  );

  app.get(
    '/batch/executions/:executionId',
    {
      schema: {
        tags: ['admin'],
        summary: '배치 실행 상세 조회',
        params: BatchExecutionIdParams,
        response: { 200: BatchExecution, 404: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      try {
        return await grpcGetBatchExecution(req.params.executionId);
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode as 404 | 500 | 503).send(mapped);
      }
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
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
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
        response: { 200: Paginated(LearnContent), 400: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      const { page = 1, limit = 20, published } = req.query;
      if (env.dataSource === 'grpc') {
        try {
          return await grpcAdminListContents({ published, page, limit });
        } catch (err) {
          const mapped = mapGrpcError(err, req.id);
          return reply.code(mapped.statusCode as 400 | 500 | 503).send(mapped);
        }
      }
      let result = [...learnContents];
      if (published !== undefined) result = result.filter((c) => c.published === published);
      return paginate(result, page, limit);
    },
  );

  app.post(
    '/learn',
    {
      schema: {
        tags: ['admin'],
        summary: '학습 콘텐츠 생성',
        body: AdminUpsertLearnContentBody,
        response: { 200: LearnContent, 400: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      requireIdempotencyKey(req);
      if (env.dataSource === 'grpc') {
        try {
          return await grpcAdminCreateContent(req.body);
        } catch (err) {
          const mapped = mapGrpcError(err, req.id);
          return reply.code(mapped.statusCode as 400 | 500 | 503).send(mapped);
        }
      }
      const content = {
        id: `learn-${Date.now()}`,
        emoji: '',
        readCount: 0,
        completed: false,
        favorite: false,
        duration: `${req.body.durationMin}분`,
        ...req.body,
      };
      learnContents.unshift(content);
      return content;
    },
  );

  app.patch(
    '/learn/:id',
    {
      schema: {
        tags: ['admin'],
        summary: '학습 콘텐츠 수정',
        params: LearnIdParams,
        body: AdminUpsertLearnContentBody,
        response: { 200: LearnContent, 400: ErrorResponse, 404: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      requireIdempotencyKey(req);
      if (env.dataSource === 'grpc') {
        try {
          return await grpcAdminUpdateContent(req.params.id, req.body);
        } catch (err) {
          const mapped = mapGrpcError(err, req.id);
          return reply.code(mapped.statusCode as 400 | 404 | 500 | 503).send(mapped);
        }
      }
      const idx = learnContents.findIndex((c) => c.id === req.params.id);
      if (idx < 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `콘텐츠를 찾을 수 없습니다: ${req.params.id}` });
      const updated = {
        ...learnContents[idx],
        ...req.body,
        duration: `${req.body.durationMin}분`,
      };
      learnContents[idx] = updated;
      return updated;
    },
  );

  app.patch(
    '/learn/:id/visibility',
    { schema: { tags: ['admin'], summary: '콘텐츠 공개 설정 (LEARN-014)', params: LearnIdParams, body: AdminUpdateLearnVisibilityBody, response: { 200: LearnContent, 400: ErrorResponse, 404: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse } } },
    async (req, reply) => {
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      if (env.dataSource === 'grpc') {
        try {
          return await grpcAdminSetContentVisibility(req.params.id, req.body.published);
        } catch (err) {
          const mapped = mapGrpcError(err, req.id);
          return reply.code(mapped.statusCode as 400 | 404 | 500 | 503).send(mapped);
        }
      }
      const content = learnContents.find((c) => c.id === req.params.id);
      if (!content) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `콘텐츠를 찾을 수 없습니다: ${req.params.id}` });
      content.published = req.body.published;
      return content;
    },
  );

  app.delete(
    '/learn/:id',
    {
      schema: {
        tags: ['admin'],
        summary: '학습 콘텐츠 삭제',
        params: LearnIdParams,
        response: { 200: EmptyResult, 404: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      requireIdempotencyKey(req);
      if (env.dataSource === 'grpc') {
        try {
          return await grpcAdminDeleteContent(req.params.id);
        } catch (err) {
          const mapped = mapGrpcError(err, req.id);
          return reply.code(mapped.statusCode as 404 | 500 | 503).send(mapped);
        }
      }
      const idx = learnContents.findIndex((c) => c.id === req.params.id);
      if (idx < 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `콘텐츠를 찾을 수 없습니다: ${req.params.id}` });
      learnContents.splice(idx, 1);
      return { success: true };
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

  // ── Notifications ──────────────────────────────────────────────────
  app.post(
    '/notifications/send',
    {
      schema: {
        tags: ['admin'],
        summary: '관리자 알림 발송',
        body: AdminSendNotificationBody,
        response: {
          200: AdminSendNotificationResult,
          400: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (req, reply) => {
      const idempotencyKey = requireIdempotencyKey(req);
      if (req.body.target !== 'user') {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: '현재는 단일 사용자 발송만 지원합니다.' });
      }
      if (env.dataSource !== 'grpc') {
        const notification = {
          id: `notification-${Date.now()}`,
          symbol: typeof req.body.meta?.symbol === 'string' ? req.body.meta.symbol : '',
          name: typeof req.body.meta?.name === 'string' ? req.body.meta.name : req.body.title,
          type: req.body.type,
          status: 'UNREAD' as const,
          message: req.body.message,
          meta: req.body.meta,
          triggeredAt: new Date().toISOString(),
        };
        return { notification };
      }
      try {
        const notification = await req.server.grpc.notification.sendNotification(
          {
            userId: req.body.userId,
            type: req.body.type,
            title: req.body.title,
            message: req.body.message,
            meta: req.body.meta,
          },
          { userId: req.body.userId, idempotencyKey },
        );
        return { notification };
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode as 400 | 404 | 500 | 503).send(mapped);
      }
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
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
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
