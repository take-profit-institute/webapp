import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { DEMO_USER_ID } from '../data/account';
import { computeTotalPoints, learnContents, learnProgress, missions, rankings } from '../data/social';
import { ErrorResponse } from '@candle/shared';
import {
  ClaimRewardResult,
  LearnContent,
  LearnFavoriteResult,
  LearnIdParams,
  LearnProgressSummary,
  LearnProgressResult,
  LearnQuery,
  Mission,
  MissionIdParams,
  MissionProgressBody,
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

  app.post(
    '/:id/claim',
    { schema: { tags: ['mission'], summary: '미션 보상 수령', params: MissionIdParams, response: { 200: ClaimRewardResult, 404: ErrorResponse, 409: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      if (!mission.completed) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '완료되지 않은 미션입니다' });
      if (mission.claimed) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '이미 보상을 수령했습니다' });
      // NOTE: not persisted — echoes the mission as claimed with the awarded points.
      return {
        mission: { ...mission, claimed: true },
        rewardedPoints: mission.reward,
        totalPoints: computeTotalPoints(),
      };
    },
  );

  app.post(
    '/:id/progress',
    { schema: { tags: ['mission'], summary: '미션 진행도 갱신', params: MissionIdParams, body: MissionProgressBody, response: { 200: Mission, 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      // NOTE: not persisted — computes the would-be progress and echoes it.
      const progress = Math.min(mission.total, mission.progress + (req.body.amount ?? 1));
      return { ...mission, progress, completed: progress >= mission.total };
    },
  );
};

export const learnRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    { schema: { tags: ['learn'], summary: '학습 콘텐츠 목록', querystring: LearnQuery, response: { 200: Type.Array(LearnContent) } } },
    async (req) => {
      let result = learnContents.filter((c) => c.published);
      if (req.query.level) result = result.filter((c) => c.level === req.query.level);
      if (req.query.category) result = result.filter((c) => c.category === req.query.category);
      if (req.query.favorite) result = result.filter((c) => c.favorite);
      if (req.query.q) {
        const q = req.query.q.toLowerCase();
        result = result.filter((c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.keywords.some((keyword) => keyword.toLowerCase().includes(q)),
        );
      }
      return result;
    },
  );

  app.get(
    '/progress',
    { schema: { tags: ['learn'], summary: '내 학습 진도율 조회 (LEARN-010)', response: { 200: LearnProgressSummary } } },
    async () => learnProgress(),
  );

  app.get(
    '/favorites',
    { schema: { tags: ['learn'], summary: '즐겨찾기 콘텐츠 조회 (LEARN-012)', response: { 200: Type.Array(LearnContent) } } },
    async () => learnContents.filter((c) => c.published && c.favorite),
  );

  app.get(
    '/recommended',
    { schema: { tags: ['learn'], summary: '학습 기록 기반 콘텐츠 추천 (LEARN-013)', response: { 200: Type.Array(LearnContent) } } },
    async () => {
      const completedCategories = new Set(learnContents.filter((c) => c.completed).map((c) => c.category));
      return learnContents
        .filter((c) => c.published && !c.completed)
        .sort((a, b) => Number(completedCategories.has(b.category)) - Number(completedCategories.has(a.category)) || b.readCount - a.readCount)
        .slice(0, 4);
    },
  );

  app.get(
    '/:id',
    { schema: { tags: ['learn'], summary: '학습 콘텐츠 상세', params: LearnIdParams, response: { 200: LearnContent, 404: ErrorResponse } } },
    async (req, reply) => {
      const content = learnContents.find((c) => c.id === req.params.id && c.published);
      if (!content) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown content: ${req.params.id}` });
      content.readCount += 1;
      return content;
    },
  );

  app.post(
    '/:id/complete',
    { schema: { tags: ['learn'], summary: '학습 콘텐츠 완독 처리', params: LearnIdParams, response: { 200: LearnProgressResult, 404: ErrorResponse } } },
    async (req, reply) => {
      const content = learnContents.find((c) => c.id === req.params.id);
      if (!content) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown content: ${req.params.id}` });
      const completedAt = new Date().toISOString();
      content.completed = true;
      content.completedAt = completedAt;
      return {
        content,
        completed: true,
        completedAt,
      };
    },
  );

  app.post(
    '/:id/favorite',
    { schema: { tags: ['learn'], summary: '즐겨찾기 등록/해제 (LEARN-011)', params: LearnIdParams, response: { 200: LearnFavoriteResult, 404: ErrorResponse } } },
    async (req, reply) => {
      const content = learnContents.find((c) => c.id === req.params.id && c.published);
      if (!content) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown content: ${req.params.id}` });
      content.favorite = !content.favorite;
      return { content, favorite: content.favorite };
    },
  );
};
