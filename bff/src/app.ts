import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './config/env';
import routes from './routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isDev
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(cors, {
    origin: env.corsOrigins,
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
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(routes);

  return app;
}
