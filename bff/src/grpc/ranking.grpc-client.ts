/**
 * ranking-service gRPC client helpers for BFF read models.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
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

export async function grpcGetMyRankingSummary(userId: string): Promise<MyRankingSummary | undefined> {
  const res = await ranking().getMyRanking({ userId }, { metadata: userMeta(userId) });
  return res.ranking ? toSummary(res.ranking) : undefined;
}
