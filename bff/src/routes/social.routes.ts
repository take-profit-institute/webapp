import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { DEMO_USER_ID } from '../data/account';
import { challenges, computeTotalPoints, learnContents, learnProgress, missionProgressStatus, missions, rankings, refreshMissionStatus } from '../data/social';
import { ErrorResponse } from '@candle/shared';
import {
  ClaimRewardResult,
  Challenge,
  ChallengeIdParams,
  ChallengeResult,
  LearnContent,
  LearnFavoriteResult,
  LearnIdParams,
  LearnProgressSummary,
  LearnProgressResult,
  LearnQuery,
  Mission,
  MissionIdParams,
  MissionParticipant,
  MissionProgressBody,
  MissionProgressStatus,
  MissionQuery,
  MissionStats,
  RankingEntry,
  UpsertChallengeBody,
  UpsertMissionBody,
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
    async (req) => {
      let result = missions.map(refreshMissionStatus).filter((m) => m.status !== 'cancelled');
      if (req.query.category) result = result.filter((m) => m.category === req.query.category);
      if (req.query.status) result = result.filter((m) => m.status === req.query.status);
      return result;
    },
  );

  app.post(
    '/admin',
    { schema: { tags: ['mission'], summary: '관리자 미션 생성 (MISSION-001/019 mock)', body: UpsertMissionBody, response: { 201: Mission } } },
    async (req, reply) => {
      const mission: Mission = {
        id: `m_${Date.now()}`,
        ...req.body,
        progress: 0,
        status: 'available',
        joined: false,
        completed: false,
        claimed: false,
      };
      missions.unshift(mission);
      return reply.status(201).send(mission);
    },
  );

  app.put(
    '/admin/:id',
    { schema: { tags: ['mission'], summary: '관리자 미션 수정 (MISSION-002/019 mock)', params: MissionIdParams, body: UpsertMissionBody, response: { 200: Mission, 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      Object.assign(mission, req.body);
      return refreshMissionStatus(mission);
    },
  );

  app.delete(
    '/admin/:id',
    { schema: { tags: ['mission'], summary: '관리자 미션 삭제 (MISSION-003 mock)', params: MissionIdParams, response: { 204: Type.Null(), 404: ErrorResponse } } },
    async (req, reply) => {
      const idx = missions.findIndex((m) => m.id === req.params.id);
      if (idx < 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      missions.splice(idx, 1);
      return reply.status(204).send(null);
    },
  );

  app.get(
    '/progress',
    { schema: { tags: ['mission'], summary: '내 미션 진행 상태 조회 (MISSION-008)', response: { 200: MissionProgressStatus } } },
    async () => missionProgressStatus(),
  );

  app.get(
    '/admin/:id/participants',
    { schema: { tags: ['mission'], summary: '관리자 참여자 조회 (MISSION-018 mock)', params: MissionIdParams, response: { 200: Type.Array(MissionParticipant), 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      if (!mission.joined) return [];
      return [{ userId: DEMO_USER_ID, username: '박유빈', missionId: mission.id, status: mission.status, progress: mission.progress, joinedAt: mission.joinedAt ?? new Date().toISOString() }];
    },
  );

  app.get(
    '/admin/:id/stats',
    { schema: { tags: ['mission'], summary: '관리자 미션 통계 조회 (MISSION-020 mock)', params: MissionIdParams, response: { 200: MissionStats, 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
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

  app.get(
    '/challenges',
    { schema: { tags: ['mission'], summary: '챌린지 목록/시즌 운영 조회 (MISSION-013)', response: { 200: Type.Array(Challenge) } } },
    async () => challenges,
  );

  app.get(
    '/challenges/:id',
    { schema: { tags: ['mission'], summary: '챌린지 상세 조회 (MISSION-014)', params: ChallengeIdParams, response: { 200: Challenge, 404: ErrorResponse } } },
    async (req, reply) => {
      const challenge = challenges.find((c) => c.id === req.params.id);
      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown challenge: ${req.params.id}` });
      return challenge;
    },
  );

  app.post(
    '/challenges/admin',
    { schema: { tags: ['mission'], summary: '관리자 챌린지 생성 (MISSION-011 mock)', body: UpsertChallengeBody, response: { 201: Challenge } } },
    async (req, reply) => {
      const challenge: Challenge = {
        id: `c_${Date.now()}`,
        ...req.body,
        status: Date.parse(req.body.startsAt) > Date.now() ? 'upcoming' : 'active',
        joined: false,
        participants: 0,
      };
      challenges.unshift(challenge);
      return reply.status(201).send(challenge);
    },
  );

  app.post(
    '/challenges/:id/join',
    { schema: { tags: ['mission'], summary: '챌린지 참여 (MISSION-012)', params: ChallengeIdParams, response: { 200: Challenge, 404: ErrorResponse, 409: ErrorResponse } } },
    async (req, reply) => {
      const challenge = challenges.find((c) => c.id === req.params.id);
      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown challenge: ${req.params.id}` });
      if (challenge.status === 'completed') return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '종료된 챌린지는 참여할 수 없습니다.' });
      if (!challenge.joined) challenge.participants += 1;
      challenge.joined = true;
      challenge.myRank = challenge.myRank ?? challenge.participants;
      return challenge;
    },
  );

  app.get(
    '/challenges/:id/result',
    { schema: { tags: ['mission'], summary: '챌린지 결과 조회 (MISSION-014)', params: ChallengeIdParams, response: { 200: ChallengeResult, 404: ErrorResponse, 409: ErrorResponse } } },
    async (req, reply) => {
      const challenge = challenges.find((c) => c.id === req.params.id);
      if (!challenge) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown challenge: ${req.params.id}` });
      if (!challenge.joined) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '참여한 챌린지만 결과를 조회할 수 있습니다.' });
      return {
        challenge,
        rank: challenge.myRank ?? 1,
        returnPercent: 8.42,
        rewardedPoints: challenge.status === 'completed' ? challenge.reward : 0,
        rewardedBadge: challenge.status === 'completed' ? challenge.badgeReward : undefined,
      };
    },
  );

  app.get(
    '/:id',
    { schema: { tags: ['mission'], summary: '미션 상세 조회 (MISSION-005)', params: MissionIdParams, response: { 200: Mission, 404: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      return refreshMissionStatus(mission);
    },
  );

  app.post(
    '/:id/join',
    { schema: { tags: ['mission'], summary: '미션 참여 (MISSION-006)', params: MissionIdParams, response: { 200: Mission, 404: ErrorResponse, 409: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      refreshMissionStatus(mission);
      if (mission.status === 'failed' || mission.status === 'completed') return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '참여할 수 없는 미션 상태입니다.' });
      mission.joined = true;
      mission.status = 'in_progress';
      mission.joinedAt = new Date().toISOString();
      mission.startedAt = mission.startedAt ?? mission.joinedAt;
      return mission;
    },
  );

  app.delete(
    '/:id/participation',
    { schema: { tags: ['mission'], summary: '미션 참여 취소 (MISSION-007)', params: MissionIdParams, response: { 200: Mission, 404: ErrorResponse, 409: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      if (mission.status !== 'in_progress') return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '진행 중인 미션만 참여 취소할 수 있습니다.' });
      mission.status = 'cancelled';
      mission.joined = false;
      return mission;
    },
  );

  app.post(
    '/:id/claim',
    { schema: { tags: ['mission'], summary: '미션 보상 수령', params: MissionIdParams, response: { 200: ClaimRewardResult, 404: ErrorResponse, 409: ErrorResponse } } },
    async (req, reply) => {
      const mission = missions.find((m) => m.id === req.params.id);
      if (!mission) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Unknown mission: ${req.params.id}` });
      refreshMissionStatus(mission);
      if (!mission.completed) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '완료되지 않은 미션입니다' });
      if (mission.claimed) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: '이미 보상을 수령했습니다' });
      mission.claimed = true;
      return {
        mission,
        rewardedPoints: mission.reward,
        rewardedBadge: mission.badgeReward,
        rewardedAchievement: mission.achievementReward,
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
      refreshMissionStatus(mission);
      if (!mission.joined && mission.status === 'available') {
        mission.joined = true;
        mission.status = 'in_progress';
        mission.joinedAt = new Date().toISOString();
      }
      if (mission.status !== 'in_progress') return mission;
      const progress = Math.min(mission.total, mission.progress + (req.body.amount ?? 1));
      mission.progress = progress;
      return refreshMissionStatus(mission);
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
