/**
 * Fastify plugin that wires gRPC clients into the app as `app.grpc`.
 *
 * Registration order in app.ts:
 *   await app.register(grpcRegistry);  // before route plugins
 *
 * Route handlers access clients via:
 *   const { account, portfolio } = req.server.grpc;
 *   const [acct, history] = await parallelFetch({ ... });
 *
 * Switching stub → real:
 *   Each createXxxServiceClient() accepts a GrpcChannel.
 *   Once nice-grpc is installed, channel.ts getChannel() returns a real Channel.
 *   No changes needed here or in route handlers.
 */
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env';
import { getChannel, closeAllChannels } from './channel';
import {
  createAuthServiceClient,
  createUserServiceClient,
  createMarketServiceClient,
  createAccountServiceClient,
  createPortfolioServiceClient,
  createRankingServiceClient,
  createNotificationServiceClient,
  createMissionServiceClient,
  createLearnServiceClient,
  type AuthServiceClient,
  type UserServiceClient,
  type MarketServiceClient,
  type AccountServiceClient,
  type PortfolioServiceClient,
  type RankingServiceClient,
  type NotificationServiceClient,
  type MissionServiceClient,
  type LearnServiceClient,
} from './clients';

export interface GrpcClients {
  auth: AuthServiceClient;
  user: UserServiceClient;
  market: MarketServiceClient;
  account: AccountServiceClient;
  portfolio: PortfolioServiceClient;
  ranking: RankingServiceClient;
  notification: NotificationServiceClient;
  mission: MissionServiceClient;
  learn: LearnServiceClient;
}

declare module 'fastify' {
  interface FastifyInstance {
    grpc: GrpcClients;
  }
}

const grpcRegistry: FastifyPluginAsync = async (app) => {
  const addr = env.grpc;

  const clients: GrpcClients = {
    auth:         createAuthServiceClient(getChannel(addr.authAddr)),
    user:         createUserServiceClient(getChannel(addr.userAddr)),
    market:       createMarketServiceClient(getChannel(addr.marketAddr)),
    account:      createAccountServiceClient(getChannel(addr.accountAddr)),
    portfolio:    createPortfolioServiceClient(getChannel(addr.portfolioAddr)),
    ranking:      createRankingServiceClient(getChannel(addr.rankingAddr)),
    notification: createNotificationServiceClient(getChannel(addr.notificationAddr)),
    mission:      createMissionServiceClient(getChannel(addr.missionAddr)),
    learn:        createLearnServiceClient(getChannel(addr.learnAddr)),
  };

  app.decorate('grpc', clients);

  app.addHook('onClose', async () => {
    closeAllChannels();
  });
};

export default fp(grpcRegistry, { name: 'grpc-registry' });
