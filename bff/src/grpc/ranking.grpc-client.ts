/**
 * ranking-service gRPC client helpers for BFF read models.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
import type { RankingEntry } from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
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
  const res = await ranking().listRankings({ page: { pageSize, pageToken: '' } });
  return res.rankings.map(toShared);
}

export async function grpcGetMyRanking(userId: string): Promise<RankingEntry | undefined> {
  const res = await ranking().getMyRanking({ userId }, { metadata: userMeta(userId) });
  return res.ranking ? toShared(res.ranking) : undefined;
}

export async function grpcGetMyRankingSummary(userId: string): Promise<MyRankingSummary | undefined> {
  const res = await ranking().getMyRanking({ userId }, { metadata: userMeta(userId) });
  return res.ranking ? toSummary(res.ranking) : undefined;
}
