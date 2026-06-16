import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: '헬스체크',
        response: {
          200: Type.Object({
            status: Type.Literal('ok'),
            uptime: Type.Number(),
            timestamp: Type.String(),
          }),
        },
      },
    },
    async () => ({ status: 'ok' as const, uptime: process.uptime(), timestamp: new Date().toISOString() }),
  );
};

export default healthRoutes;
