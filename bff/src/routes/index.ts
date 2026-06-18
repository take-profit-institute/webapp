import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import accountRoutes from './account.routes';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import marketRoutes from './market.routes';
import { learnRoutes, missionRoutes, rankingRoutes } from './social.routes';
import userRoutes from './user.routes';
import notificationRoutes from './notifications.routes';

/** Registers every route group. Domain APIs live under `/api/*`. */
const routes: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(healthRoutes);

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(userRoutes, { prefix: '/users' });
      await api.register(marketRoutes, { prefix: '/market' });
      await api.register(accountRoutes, { prefix: '/account' });
      await api.register(rankingRoutes, { prefix: '/rankings' });
      await api.register(missionRoutes, { prefix: '/missions' });
      await api.register(learnRoutes, { prefix: '/learn' });
      await api.register(notificationRoutes, { prefix: '/notifications' });
    },
    { prefix: '/api' },
  );
};

export default routes;
