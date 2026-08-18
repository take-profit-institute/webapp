import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  AdvisoryRecommendationBody,
  AdvisoryRecommendationResult,
  ErrorResponse,
} from '@candle/shared';
import { grpcGetAdvisoryRecommendations } from '../grpc/advisory.grpc-client';
import { mapGrpcError } from '../grpc';

const DEV_ADVISORY_USER_ID = '00000000-0000-0000-0000-000000000001';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveAdvisoryActor(req: { headers: Record<string, unknown> }): string {
  const header = req.headers['x-account-id'];
  return typeof header === 'string' && UUID_RE.test(header) ? header : DEV_ADVISORY_USER_ID;
}

const advisoryRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/recommendations',
    {
      schema: {
        tags: ['advisory'],
        summary: '투자성향 기반 종목 추천',
        body: AdvisoryRecommendationBody,
        response: {
          200: AdvisoryRecommendationResult,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
          504: ErrorResponse,
        },
      },
    },
    async (req, reply) => {
      try {
        return await grpcGetAdvisoryRecommendations(resolveAdvisoryActor(req), req.body);
      } catch (e) {
        const mapped = mapGrpcError(e, req.id);
        return reply.code(mapped.statusCode as 400 | 401 | 500 | 503 | 504).send(mapped);
      }
    },
  );
};

export default advisoryRoutes;
