import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  Notification,
  NotificationIdParams,
  NotificationListQuery,
  NotificationType,
  NotificationStatus,
  RegisterDeviceTokenBody,
  RegisterDeviceTokenResult,
  UnreadCountResult,
  ErrorResponse,
} from '@candle/shared';
import {
  notifications,
  getUnreadCount,
  markRead,
  markAllRead,
  removeNotification,
} from '../data/notifications';
import { mapGrpcError, requireIdempotencyKey } from '../grpc';
import { env } from '../config/env';

// In-memory token store (replace with DB in production)
const fcmTokens = new Map<string, { token: string; platform: string; deviceId?: string; updatedAt: string }>();

function extractUserId(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const v = req.headers['x-account-id'];
  return Array.isArray(v) ? v[0] : v;
}

function mockDeviceTokenId(token: string): string {
  return `mock-${Buffer.from(token).toString('base64url').slice(0, 24)}`;
}

const notificationRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/token',
    {
      schema: {
        tags: ['notification'],
        summary: 'FCM 토큰 등록',
        body: RegisterDeviceTokenBody,
        response: {
          200: RegisterDeviceTokenResult,
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
      },
    },
    async (req, reply) => {
      const userId = extractUserId(req);
      if (!userId) return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: '인증 정보가 없습니다.' });

      const idempotencyKey = requireIdempotencyKey(req);
      const { token, platform, deviceId } = req.body;

      if (env.dataSource !== 'grpc') {
        fcmTokens.set(token, { token, platform, deviceId, updatedAt: new Date().toISOString() });
        return { deviceTokenId: mockDeviceTokenId(token) };
      }

      try {
        return await req.server.grpc.notification.registerDeviceToken(
          { userId, token, platform, deviceId },
          { userId, idempotencyKey },
        );
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode as 400 | 401 | 404 | 409 | 500 | 503).send(mapped);
      }
    },
  );

  app.get(
    '/',
    {
      schema: {
        tags: ['notification'],
        summary: '알림 목록 조회',
        querystring: NotificationListQuery,
        response: { 200: Type.Array(Notification) },
      },
    },
    async (req) => {
      const { limit = 20, offset = 0, status } = req.query;
      let result = [...notifications].sort(
        (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
      );
      if (status) result = result.filter((n) => n.status === status);
      return result.slice(offset, offset + limit);
    },
  );

  app.get(
    '/unread-count',
    {
      schema: {
        tags: ['notification'],
        summary: '읽지 않은 알림 수',
        response: { 200: UnreadCountResult },
      },
    },
    async () => ({ count: getUnreadCount() }),
  );

  app.patch(
    '/:id/read',
    {
      schema: {
        tags: ['notification'],
        summary: '단건 읽음 처리',
        params: NotificationIdParams,
        response: { 204: Type.Null(), 404: ErrorResponse },
      },
    },
    async (req, reply) => {
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      const updated = markRead(req.params.id);
      if (!updated) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: '알림을 찾을 수 없습니다' });
      }
      return reply.status(204).send(null);
    },
  );

  app.patch(
    '/read-all',
    {
      schema: {
        tags: ['notification'],
        summary: '전체 읽음 처리',
        response: { 204: Type.Null() },
      },
    },
    async (req, reply) => {
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      markAllRead();
      return reply.status(204).send(null);
    },
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags: ['notification'],
        summary: '알림 삭제',
        params: NotificationIdParams,
        response: { 204: Type.Null(), 404: ErrorResponse },
      },
    },
    async (req, reply) => {
      requireIdempotencyKey(req); // 쓰기 요청: 멱등성 키 검증 (누락/형식오류 → 400)
      const removed = removeNotification(req.params.id);
      if (!removed) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: '알림을 찾을 수 없습니다' });
      }
      return reply.status(204).send(null);
    },
  );
};

export default notificationRoutes;
