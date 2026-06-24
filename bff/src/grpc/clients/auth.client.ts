import { createClientFactory } from 'nice-grpc';
import type { GrpcChannel } from '../channel';
import { AuthServiceDefinition } from '../gen/candle/auth/v1/auth';
import type { AuthServiceClient as NiceGrpcAuthClient } from '../gen/candle/auth/v1/auth';

export type AuthServiceClient = NiceGrpcAuthClient;

export function createAuthServiceClient(channel: GrpcChannel): AuthServiceClient {
  return createClientFactory().create(AuthServiceDefinition, channel);
}
