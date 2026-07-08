/**
 * ranking-service gRPC client helpers for BFF read models.
 */
import { ClientError, createClient, Metadata, type Client } from 'nice-grpc';
import type { RankingEntry } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import { GrpcStatus } from './types';
import {
  RankingServiceDefinition,
  type RankingEntry as ProtoRankingEntry,
} from './gen/candle/ranking/v1/ranking';
import { UserServiceDefinition } from './gen/candle/user/v1/user';

type RankingClient = Client<typeof RankingServiceDefinition>;
type UserClient = Client<typeof UserServiceDefinition>;

let rankingClient: RankingClient | null = null;
let userClient: UserClient | null = null;

function ranking(): RankingClient {
  return (rankingClient ??= createClient(RankingServiceDefinition, getChannel(env.grpc.rankingAddr)));
}

function user(): UserClient {
  return (userClient ??= createClient(UserServiceDefinition, getChannel(env.grpc.userAddr)));
}

const userMeta = (userId: string): Metadata => Metadata({ 'x-user-id': userId });

interface UserDisplayProfile {
  nickname: string;
  avatar: string;
}

async function getUserDisplayProfile(userId: string): Promise<UserDisplayProfile | undefined> {
  try {
    const res = await user().getMe({ userId }, { metadata: userMeta(userId) });
    if (!res.profile) return undefined;
    return {
      nickname: res.profile.nickname,
      avatar: res.profile.profileImageUrl,
    };
  } catch {
    return undefined;
  }
}

function toShared(entry: ProtoRankingEntry, userProfile?: UserDisplayProfile): RankingEntry {
  return {
    rank: Number(entry.rank),
    userId: entry.userId,
    username: userProfile?.nickname || entry.nickname,
    avatar: userProfile?.avatar || '',
    returnPercent: Number(entry.returnRate),
    totalAsset: Number(entry.totalAsset),
    dayChangePercent: 0,
  };
}

export interface MyRankingSummary {
  rank: number;
  returnPercent: number;
}

function toSummary(entry: ProtoRankingEntry): MyRankingSummary {
  return {
    rank: Number(entry.rank),
    returnPercent: Number(entry.returnRate),
  };
}

export async function grpcListRankings(pageSize = 20): Promise<RankingEntry[]> {
  try {
    const res = await ranking().listRankings({ page: { pageSize, pageToken: '' } });
    const profiles = await Promise.all(res.rankings.map((entry) => getUserDisplayProfile(entry.userId)));
    return res.rankings.map((entry, index) => toShared(entry, profiles[index]));
  } catch (err) {
    // 랭킹 데이터가 아직 없으면(RANKING_NOT_FOUND) 오류가 아니라 빈 목록으로 취급 → 200 []
    if (err instanceof ClientError && err.code === GrpcStatus.NOT_FOUND) return [];
    throw err;
  }
}

export async function grpcGetMyRanking(userId: string): Promise<RankingEntry | undefined> {
  try {
    const res = await ranking().getMyRanking({ userId }, { metadata: userMeta(userId) });
    if (!res.ranking) return undefined;
    return toShared(res.ranking, await getUserDisplayProfile(res.ranking.userId));
  } catch (err) {
    if (err instanceof ClientError && err.code === GrpcStatus.NOT_FOUND) return undefined;
    throw err;
  }
}

export async function grpcGetMyRankingSummary(userId: string): Promise<MyRankingSummary | undefined> {
  try {
    const res = await ranking().getMyRanking({ userId }, { metadata: userMeta(userId) });
    return res.ranking ? toSummary(res.ranking) : undefined;
  } catch (err) {
    if (err instanceof ClientError && err.code === GrpcStatus.NOT_FOUND) return undefined;
    throw err;
  }
}
