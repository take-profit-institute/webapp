import type { FastifyPluginAsync } from 'fastify';
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

export default accountContextPlugin;
