import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { verifyToken } from './jwt';

function bearerToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const [scheme, token] = value.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

const accountContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req) => {
    const token = bearerToken(req.headers.authorization);
    if (!token) return;

    const claims = await verifyToken(token);
    if (!claims) return;

    req.headers['x-account-id'] = claims.sub;
    if (claims.role) req.headers['x-account-role'] = claims.role;
  });
};

// fastify-plugin으로 감싸 캡슐화를 해제한다. 감싸지 않으면 onRequest 훅이
// 이 플러그인 컨텍스트에만 적용돼 이후 register된 라우트에는 x-account-id가
// 세팅되지 않아 전부 401이 된다. (grpc-registry / pubsub 와 동일 패턴)
export default fp(accountContextPlugin, { name: 'account-context' });
