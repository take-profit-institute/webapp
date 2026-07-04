/**
 * mission-service gRPC client helpers for BFF read models.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
import { env } from '../config/env';
import { getChannel } from './channel';
import { MissionServiceDefinition } from './gen/candle/mission/v1/mission';

type MissionClient = Client<typeof MissionServiceDefinition>;

let missionClient: MissionClient | null = null;

function mission(): MissionClient {
  return (missionClient ??= createClient(MissionServiceDefinition, getChannel(env.grpc.missionAddr)));
}

const userMeta = (userId: string): Metadata => Metadata({ 'x-user-id': userId });

export interface MissionSummary {
  active: number;
  completed: number;
}

export async function grpcGetMissionSummary(userId: string): Promise<MissionSummary> {
  const res = await mission().listMissions({ userId }, { metadata: userMeta(userId) });

  // Current mission proto exposes mission definitions only, not per-user completion
  // state in ListMissions. Treat listed missions as active until the proto adds state.
  return {
    active: res.missions.length,
    completed: 0,
  };
}
