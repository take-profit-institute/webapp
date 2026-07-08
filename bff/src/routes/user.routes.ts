import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { DEMO_USER_ID, getAccount } from '../data/account';
import { missions, rankings } from '../data/social';
import { demoUser, isNicknameAvailable } from '../data/user';
import { env } from '../config/env';
import {
  ErrorResponse,
  MyPageSummary,
  NicknameCheckQuery,
  NicknameCheckResult,
  UpdateProfileBody,
  UserProfile,
} from '@candle/shared';
import type { UserProfile as SharedUserProfile } from '@candle/shared';
import type { UserProfile as GrpcUserProfile } from '../grpc/gen/candle/user/v1/user';
import { mapGrpcError, requireIdempotencyKey } from '../grpc';
import { parallelFetch } from '../grpc/parallel';
import { grpcGetAccountSummary } from '../grpc/portfolio.grpc-client';
import { grpcGetMyRankingSummary } from '../grpc/ranking.grpc-client';

function toSharedProfile(grpc: GrpcUserProfile): SharedUserProfile {
  return {
    id: grpc.userId,
    username: grpc.nickname || `캔들${grpc.userId.replace(/-/g, '').slice(0, 8)}`,
    email: grpc.email,
    avatar: grpc.profileImageUrl || '🐯',
    role: 'USER',
    status: grpc.deleted ? 'withdrawn' : 'active',
    createdAt: grpc.audit?.createdAt?.toISOString() ?? new Date(0).toISOString(),
  };
}

function extractUserId(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const v = req.headers['x-account-id'];
  return Array.isArray(v) ? v[0] : v;
}

const E401 = { 401: ErrorResponse };
const E404 = { 404: ErrorResponse };
const E4xx = { 401: ErrorResponse, 404: ErrorResponse, 503: ErrorResponse };

const userRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/me',
    { schema: { tags: ['user'], summary: '사용자 정보 조회 (auth + user 병합)', response: { 200: UserProfile, ...E4xx } } },
    async (req, reply) => {
      const userId = extractUserId(req);
      if (!userId) return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: '인증 정보가 없습니다.' });
      try {
        const { authMe, userMe } = await parallelFetch({
          authMe: req.server.grpc.auth.getMe({ userId }),
          userMe: req.server.grpc.user.getMe({ userId }, { userId }),
        });
        if (!userMe.profile) return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: '사용자를 찾을 수 없습니다.' });
        return {
          ...toSharedProfile(userMe.profile),
          ...(authMe.user?.provider ? { provider: authMe.user.provider as SharedUserProfile['provider'] } : {}),
          ...(authMe.user?.email ? { email: authMe.user.email } : {}),
        };
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode).send(mapped);
      }
    },
  );

  app.patch(
    '/me',
    { schema: { tags: ['user'], summary: '프로필 수정 (닉네임/이미지/투자성향)', body: UpdateProfileBody, response: { 200: UserProfile, ...E4xx } } },
    async (req, reply) => {
      const userId = extractUserId(req);
      if (!userId) return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: '인증 정보가 없습니다.' });
      const idempotencyKey = requireIdempotencyKey(req);
      try {
        const current = await req.server.grpc.user.getMe({ userId }, { userId });
        if (!current.profile) return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: '사용자를 찾을 수 없습니다.' });
        const res = await req.server.grpc.user.updateProfile(
          {
            userId,
            nickname: req.body.username ?? current.profile.nickname,
            profileImageUrl: req.body.avatar ?? current.profile.profileImageUrl,
            commandMetadata: { idempotencyKey },
          },
          { userId, idempotencyKey },
        );
        if (!res.profile) return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: '사용자를 찾을 수 없습니다.' });
        const profile = toSharedProfile(res.profile);
        return req.body.investStyle ? { ...profile, investStyle: req.body.investStyle } : profile;
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode).send(mapped);
      }
    },
  );

  app.get(
    '/nickname/check',
    { schema: { tags: ['user'], summary: '닉네임 중복 검사', querystring: NicknameCheckQuery, response: { 200: NicknameCheckResult } } },
    // TODO: proto에 CheckNickname 추가 시 gRPC 연결
    async (req) => ({ nickname: req.query.nickname, available: isNicknameAvailable(req.query.nickname) }),
  );

  app.post(
    '/me/withdraw',
    { schema: { tags: ['user'], summary: '회원 탈퇴', response: { 200: UserProfile, ...E401 } } },
    // TODO: proto에 Withdraw 추가 시 gRPC 연결
    async (req) => {
      requireIdempotencyKey(req);
      return { ...demoUser, status: 'withdrawn' as const };
    },
  );

  app.get(
    '/me/summary',
    { schema: { tags: ['user'], summary: '마이페이지 집계 (프로필+성과+자산+랭킹+챌린지)', response: { 200: MyPageSummary, ...E4xx } } },
    async (req, reply) => {
      const userId = extractUserId(req);
      if (!userId) return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: '인증 정보가 없습니다.' });
      try {
        if (env.dataSource === 'grpc') {
          // mission-service는 gRPC 서버가 없어(HTTP 전용) 호출하면 없는 9090으로 붙느라 데드라인까지
          // 대기 → 병렬 fan-out 전체가 느려진다. 챌린지 집계는 gRPC 호출 없이 0 고정으로 반환한다.
          // (mission이 gRPC 서버를 갖추면 grpcGetMissionSummary 호출을 되살린다)
          const { userMe, account, ranking } = await parallelFetch({
            userMe: req.server.grpc.user.getMe({ userId }, { userId }),
            account: grpcGetAccountSummary(userId),
            ranking: grpcGetMyRankingSummary(userId).catch(() => undefined),
          });
          if (!userMe.profile) return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: '사용자를 찾을 수 없습니다.' });
          return {
            profile: toSharedProfile(userMe.profile),
            performance: { totalReturnPercent: account.totalReturnPercent, totalProfitLoss: account.totalProfitLoss },
            assets: { totalAsset: account.totalAsset, cash: account.cash, investedAmount: account.investedAmount },
            ranking,
            challenges: { active: 0, completed: 0 },
          };
        }

        const account = getAccount();
        const myRanking = rankings.find((r) => r.userId === DEMO_USER_ID);
        return {
          profile: demoUser,
          performance: { totalReturnPercent: account.totalReturnPercent, totalProfitLoss: account.totalProfitLoss },
          assets: { totalAsset: account.totalAsset, cash: account.cash, investedAmount: account.investedAmount },
          ranking: myRanking ? { rank: myRanking.rank, returnPercent: myRanking.returnPercent } : undefined,
          challenges: {
            active: missions.filter((m) => !m.completed).length,
            completed: missions.filter((m) => m.completed).length,
          },
        };
      } catch (err) {
        const mapped = mapGrpcError(err, req.id);
        return reply.code(mapped.statusCode).send(mapped);
      }
    },
  );
};

export default userRoutes;
