import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { adminUser } from '../data/user';
import { learnContents, missions } from '../data/social';
import { DEMO_USER_ID } from '../data/account';
import {
  AdminLearnStats,
  AdminUpdateLearnVisibilityBody,
  AdminUpsertLearnContentBody,
  AdminSendNotificationBody,
  AdminSendNotificationResult,
  AdminUpdateMissionRewardBody,
  BatchExecution,
  BatchExecutionIdParams,
  BatchExecutionListQuery,
  BatchJob,
  BatchJobNameParams,
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
  UserRole,
} from '@candle/shared';
import { env } from '../config/env';
import { ERROR_CODES, PublicError } from '../errors';
import { verifyToken } from '../plugins/jwt';
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

function paginate<T>(arr: T[], page: number, limit: number) {
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return { items: arr.slice(start, start + limit), total, page: safePage, limit, totalPages };
}

const AdminLoginBody = Type.Object({
  username: Type.String({ minLength: 1 }),
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
  // ── Auth guard ───────────────────────────────────────────────────────
  // /login을 제외한 모든 admin 라우트는 유효한 admin access token(ADMIN|SUPER_ADMIN)을 요구한다.
  // 공개 라우트는 route config에 { public: true }로 표시한다.
  app.addHook('preHandler', async (req) => {
    if ((req.routeOptions?.config as { public?: boolean } | undefined)?.public) return;
    const header = req.headers['authorization'];
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new PublicError(401, ERROR_CODES.UNAUTHORIZED);
    const claims = await verifyToken(token);
    if (!claims) throw new PublicError(401, ERROR_CODES.UNAUTHORIZED);
    if (claims.role !== 'ADMIN' && claims.role !== 'SUPER_ADMIN') {
      throw new PublicError(403, ERROR_CODES.FORBIDDEN);
    }
  });

  // ── Auth ────────────────────────────────────────────────────────────
  app.post(
    '/login',
    {
      config: { public: true },
      schema: {
        tags: ['admin'],
        summary: '관리자 로그인 (auth-service gRPC)',
        body: AdminLoginBody,
        response: { 200: OAuthLoginResult, 400: ErrorResponse, 401: ErrorResponse, 403: ErrorResponse, 422: ErrorResponse, 500: ErrorResponse, 503: ErrorResponse },
      },
    },
    async (req, reply) => {
      try {
        const res = await req.server.grpc.auth.adminLogin({ username: req.body.username, password: req.body.password });
        const user: UserProfile = {
          id: res.adminId,
          username: res.displayName || res.username,
          // 관리자 계정은 이메일이 없다(username/password 로그인). UI 표시는 username을 쓴다.
          email: '',
          avatar: adminUser.avatar,
          role: res.role as UserRole,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        return {
          tokens: {
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            tokenType: 'Bearer' as const,
            // int64는 ts-proto forceLong=string 설정으로 문자열이라 Number로 변환한다.
            expiresIn: Number(res.expiresIn),
            refreshExpiresIn: Number(res.refreshExpiresIn),
          },
          user,
          isNewUser: false,
        };
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode as 400 | 401 | 403 | 422 | 500 | 503).send(mapped);
      }
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

  // ── Users ───────────────────────────────────────────────────────────
  // 앱 일반 유저 목록/정지 백엔드는 아직 없다. admin 콘솔의 "사용자 관리"는
  // auth-service의 관리자 계정 API(/api/v1/admin/accounts)를 게이트웨이로 직접
  // 호출하므로(BFF 경유 아님), 여기에 mock 라우트를 두지 않는다.

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
