/**
 * MissionService gRPC client stub.
 * Owns: daily/weekly missions, challenges, reward claims, user progress.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export type MissionStatus = 'active' | 'completed' | 'expired';
export type ChallengeStatus = 'upcoming' | 'active' | 'ended';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  rewardXp: number;
  rewardCash: number;
  status: MissionStatus;
  progress: number;
  target: number;
  expiresAt: string;
  claimedAt?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  status: ChallengeStatus;
  startAt: string;
  endAt: string;
  participantCount: number;
  joined?: boolean;
  myProgress?: number;
}

export interface MissionServiceClient {
  getMissions(req: { userId: string }, opts?: GrpcCallOptions): Promise<Mission[]>;
  getMission(req: { userId: string; missionId: string }, opts?: GrpcCallOptions): Promise<Mission>;
  claimReward(req: { userId: string; missionId: string }, opts?: GrpcCallOptions): Promise<{ xp: number; cash: number }>;
  getChallenges(req: { status?: ChallengeStatus }, opts?: GrpcCallOptions): Promise<Challenge[]>;
  joinChallenge(req: { userId: string; challengeId: string }, opts?: GrpcCallOptions): Promise<void>;
  getMyProgress(req: { userId: string; challengeId: string }, opts?: GrpcCallOptions): Promise<{ progress: number }>;
}

class StubMissionServiceClient implements MissionServiceClient {
  getMissions(): Promise<Mission[]> { return notImplemented('MissionService', 'getMissions'); }
  getMission(): Promise<Mission> { return notImplemented('MissionService', 'getMission'); }
  claimReward(): Promise<{ xp: number; cash: number }> { return notImplemented('MissionService', 'claimReward'); }
  getChallenges(): Promise<Challenge[]> { return notImplemented('MissionService', 'getChallenges'); }
  joinChallenge(): Promise<void> { return notImplemented('MissionService', 'joinChallenge'); }
  getMyProgress(): Promise<{ progress: number }> { return notImplemented('MissionService', 'getMyProgress'); }
}

export function createMissionServiceClient(_channel: GrpcChannel): MissionServiceClient {
  return new StubMissionServiceClient();
}
