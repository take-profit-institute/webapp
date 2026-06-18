/**
 * RankingService gRPC client stub.
 * Owns: leaderboard projection, personal rank.
 * CDC-sourced from AccountService/PortfolioService events.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export interface RankEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  returnPercent: number;
  totalAsset: number;
  isMe?: boolean;
}

export interface LeaderboardRequest {
  limit?: number;
  offset?: number;
  period?: 'daily' | 'weekly' | 'monthly' | 'alltime';
}

export interface RankingServiceClient {
  getLeaderboard(req: LeaderboardRequest, opts?: GrpcCallOptions): Promise<RankEntry[]>;
  getMyRank(req: { userId: string }, opts?: GrpcCallOptions): Promise<RankEntry>;
}

class StubRankingServiceClient implements RankingServiceClient {
  getLeaderboard(): Promise<RankEntry[]> { return notImplemented('RankingService', 'getLeaderboard'); }
  getMyRank(): Promise<RankEntry> { return notImplemented('RankingService', 'getMyRank'); }
}

export function createRankingServiceClient(_channel: GrpcChannel): RankingServiceClient {
  return new StubRankingServiceClient();
}
