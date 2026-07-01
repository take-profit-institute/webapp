import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './config/env';
import pubsubPlugin from './plugins/pubsub.plugin';
import marketStreamPlugin from './services/market-stream.service';
import tickStorePlugin from './services/tick-store.service';
import mockMarketStream from './mock/market-stream.mock';
import wsRoutes from './routes/ws.routes';
import routes from './routes';
import { grpcRegistry } from './grpc';
import { handleError, normalizeErrorPayload } from './errors';

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (env.corsOrigins.includes(origin)) return true;
  return env.corsOriginPatterns.some((pattern) => pattern.test(origin));
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isDev
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  });

  // Auto-generated OpenAPI spec from the route schemas (served at /docs).
  await app.register(swagger, {
    openapi: {
      info: { title: 'Candle BFF', description: 'Backend-for-Frontend for the Candle mock-investment app', version: '0.1.0' },
      servers: [{ url: `http://localhost:${env.port}` }],
      tags: [
        { name: 'system' },
        { name: 'auth' },
        { name: 'user' },
        { name: 'market' },
        { name: 'account' },
        { name: 'ranking' },
        { name: 'mission' },
        { name: 'learn' },
        { name: 'notification' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(grpcRegistry);

  await app.register(pubsubPlugin);
  await app.register(websocket);
  await app.register(marketStreamPlugin);
  await app.register(tickStorePlugin);
  await app.register(mockMarketStream);
  await app.register(wsRoutes);

  app.addHook('preSerialization', (req, reply, payload, done) => {
    done(null, normalizeErrorPayload(req, reply, payload));
  });

  app.setErrorHandler(handleError);

  await app.register(routes);

  return app;
}
