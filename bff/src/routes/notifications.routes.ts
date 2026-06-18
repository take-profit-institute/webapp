import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  Notification,
  NotificationIdParams,
  NotificationListQuery,
  NotificationType,
  NotificationStatus,
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

const notificationRoutes: FastifyPluginAsyncTypebox = async (app) => {
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
    async (_req, reply) => {
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
      const removed = removeNotification(req.params.id);
      if (!removed) {
        return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: '알림을 찾을 수 없습니다' });
      }
      return reply.status(204).send(null);
    },
  );
};

export default notificationRoutes;
