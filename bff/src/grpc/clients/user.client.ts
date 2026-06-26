import { createClientFactory, type Client } from 'nice-grpc';
import type { GrpcChannel } from '../channel';
import { UserServiceDefinition } from '../gen/candle/user/v1/user';
import { createDeadlineInterceptor } from '../interceptors/deadline.interceptor';
import { createIdempotencyInterceptor } from '../idempotency/interceptor';
import { env } from '../../config/env';
import type { GrpcCallOptions } from '../types';

export type UserServiceClient = Client<typeof UserServiceDefinition, GrpcCallOptions>;

export function createUserServiceClient(channel: GrpcChannel): UserServiceClient {
  return createClientFactory()
    .use(createDeadlineInterceptor(env.grpc.deadlineMs))
    .use(createIdempotencyInterceptor())
    .create(UserServiceDefinition, channel);
}
