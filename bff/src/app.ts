import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify, { type FastifyInstance } from 'fastify';
import { env } from './config/env';
import accountContextPlugin from './plugins/account-context.plugin';
import pubsubPlugin from './plugins/pubsub.plugin';
import marketDemandPlugin from './services/market-demand.service';
import marketStreamPlugin from './services/market-stream.service';
import tickStorePlugin from './services/tick-store.service';
import marketBridgePlugin from './services/market-bridge.service';
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

  // body 없는 액션 POST(예: /learn/:id/complete, /favorite)를 허용한다.
  // 클라이언트가 Content-Type: application/json 을 붙이고 body를 비워 보내도
  // FST_ERR_CTP_EMPTY_JSON_BODY 로 실패하지 않도록 빈 문자열을 {} 로 처리한다.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const raw = typeof body === 'string' ? body : '';
    if (raw.trim().length === 0) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      (err as { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  });

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

  await app.register(accountContextPlugin);
  await app.register(pubsubPlugin);
  await app.register(websocket);
  await app.register(marketDemandPlugin); // 모델 B: 뷰어 refcount → StreamQuotes upstream open/close
  await app.register(marketStreamPlugin);
  await app.register(tickStorePlugin);
  await app.register(marketBridgePlugin); // stock-price(raw) → bff:quotes(WsQuoteUpdate)
  await app.register(mockMarketStream);
  await app.register(wsRoutes);

  app.addHook('preSerialization', (req, reply, payload, done) => {
    done(null, normalizeErrorPayload(req, reply, payload));
  });

  app.setErrorHandler(handleError);

  await app.register(routes);

  return app;
}
