import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { DEMO_USER_ID } from '../data/account';
import { learnContents, missions, rankings } from '../data/social';
import { ErrorResponse } from '@candle/shared';
import {
  LearnContent,
  LearnQuery,
  Mission,
  MissionQuery,
  RankingEntry,
} from '@candle/shared';

/** Ranking, missions and learning content — app-domain data (DB-backed later). */
export const rankingRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    { schema: { tags: ['ranking'], summary: '투자 랭킹', response: { 200: Type.Array(RankingEntry) } } },
    async () => rankings,
  );

  app.get(
    '/me',
    { schema: { tags: ['ranking'], summary: '내 랭킹', response: { 200: RankingEntry, 404: ErrorResponse } } },
    async (_req, reply) => {
      const me = rankings.find((r) => r.userId === DEMO_USER_ID);
      if (!me) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'No ranking for current user' });
      return me;
    },
  );
};

export const missionRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    { schema: { tags: ['mission'], summary: '미션/챌린지 목록', querystring: MissionQuery, response: { 200: Type.Array(Mission) } } },
    async (req) => (req.query.category ? missions.filter((m) => m.category === req.query.category) : missions),
  );
};

export const learnRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    { schema: { tags: ['learn'], summary: '학습 콘텐츠 목록', querystring: LearnQuery, response: { 200: Type.Array(LearnContent) } } },
    async (req) => {
      let result = learnContents;
      if (req.query.level) result = result.filter((c) => c.level === req.query.level);
      if (req.query.category) result = result.filter((c) => c.category === req.query.category);
      return result;
    },
  );

  app.get(
    '/:id',
    { schema: { tags: ['learn'], summary: '학습 콘텐츠 상세', params: Type.Object({ id: Type.String() }), response: { 200: LearnContent, 404: ErrorResponse } } },
    async (req, reply) => {
      const content = learnContents.find((c) => c.id === req.params.id);
      if (!content) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown content: ${req.params.id}` });
      return content;
    },
  );
};
