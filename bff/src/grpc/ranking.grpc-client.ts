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

type RankingClient = Client<typeof RankingServiceDefinition>;

let rankingClient: RankingClient | null = null;

function ranking(): RankingClient {
  return (rankingClient ??= createClient(RankingServiceDefinition, getChannel(env.grpc.rankingAddr)));
}

const userMeta = (userId: string): Metadata => Metadata({ 'x-user-id': userId });

function toShared(entry: ProtoRankingEntry): RankingEntry {
  return {
    rank: Number(entry.rank),
    userId: entry.userId,
    username: entry.nickname,
    avatar: '',
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
    return res.rankings.map(toShared);
  } catch (err) {
    // 랭킹 데이터가 아직 없으면(RANKING_NOT_FOUND) 오류가 아니라 빈 목록으로 취급 → 200 []
    if (err instanceof ClientError && err.code === GrpcStatus.NOT_FOUND) return [];
    throw err;
  }
}

export async function grpcGetMyRanking(userId: string): Promise<RankingEntry | undefined> {
  try {
    const res = await ranking().getMyRanking({ userId }, { metadata: userMeta(userId) });
    return res.ranking ? toShared(res.ranking) : undefined;
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
