import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { DEMO_USER_ID, getAccount } from '../data/account';
import { missions, rankings } from '../data/social';
import { demoUser, isNicknameAvailable } from '../data/user';
import {
  MyPageSummary,
  NicknameCheckQuery,
  NicknameCheckResult,
  UpdateProfileBody,
  UserProfile,
} from '@candle/shared';

/**
 * User Service (mock) — 회원/프로필/마이페이지 (USER-*).
 * 회원 생성(USER-001)·상태 제공(USER-018)·Auth 매핑(USER-017)·감사(USER-022/023)는
 * 실제 User Service 내부 책임이라 목 범위 밖이며, 여기서는 조회/수정/탈퇴/집계 계약만 제공합니다.
 */
const userRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/me',
    { schema: { tags: ['user'], summary: '사용자 정보 조회', response: { 200: UserProfile } } },
    // USER-002/011/012/022 — 기본 프로필 + 이메일 + 가입일.
    async () => demoUser,
  );

  app.patch(
    '/me',
    { schema: { tags: ['user'], summary: '프로필 수정 (닉네임/이미지/투자성향)', body: UpdateProfileBody, response: { 200: UserProfile } } },
    // USER-003/008/010 — not persisted; merges and echoes.
    async (req) => ({ ...demoUser, ...req.body }),
  );

  app.get(
    '/nickname/check',
    { schema: { tags: ['user'], summary: '닉네임 중복 검사', querystring: NicknameCheckQuery, response: { 200: NicknameCheckResult } } },
    // USER-009
    async (req) => ({ nickname: req.query.nickname, available: isNicknameAvailable(req.query.nickname) }),
  );

  app.post(
    '/me/withdraw',
    { schema: { tags: ['user'], summary: '회원 탈퇴', response: { 200: UserProfile } } },
    // USER-004/005 — 상태를 WITHDRAWN으로(mock). 이후 로그인은 USER-006으로 차단됨.
    async () => ({ ...demoUser, status: 'withdrawn' as const }),
  );

  app.get(
    '/me/summary',
    { schema: { tags: ['user'], summary: '마이페이지 집계 (프로필+성과+자산+랭킹+챌린지)', response: { 200: MyPageSummary } } },
    // USER-012~016 — BFF가 User·Account·Ranking·Mission 결과를 합성한 read 모델.
    async () => {
      const account = getAccount();
      const myRanking = rankings.find((r) => r.userId === DEMO_USER_ID);
      return {
        profile: demoUser,
        performance: {
          totalReturnPercent: account.totalReturnPercent,
          totalProfitLoss: account.totalProfitLoss,
        },
        assets: {
          totalAsset: account.totalAsset,
          cash: account.cash,
          investedAmount: account.investedAmount,
        },
        ranking: myRanking ? { rank: myRanking.rank, returnPercent: myRanking.returnPercent } : undefined,
        challenges: {
          active: missions.filter((m) => !m.completed).length,
          completed: missions.filter((m) => m.completed).length,
        },
      };
    },
  );
};

export default userRoutes;
