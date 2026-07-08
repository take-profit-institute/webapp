import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { verifyToken } from './jwt';

function bearerToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const [scheme, token] = value.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

// access_token 은 auth-service가 httpOnly 쿠키(path=/)로도 내려준다. 브라우저가 Authorization
// 헤더 없이 쿠키만 보내는 경우(SPA 부팅/딥링크, 헤더 유실 등)를 위해 쿠키에서도 토큰을 읽는다.
// httpOnly라 프런트 JS는 헤더에 못 실으므로 이 폴백이 실질 진입 경로가 된다.
function cookieToken(cookieHeader: unknown, name: string): string | null {
  if (typeof cookieHeader !== 'string') return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    return value ? decodeURIComponent(value) : null;
  }
  return null;
}

const accountContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req) => {
    // 클라이언트가 위조해 보낸 actor 헤더를 먼저 제거한다(스푸핑 차단). 유효 토큰이 검증된
    // 경우에만 아래에서 다시 세팅한다 — 예전 게이트웨이의 덮어쓰기 방어와 동일 효과.
    delete req.headers['x-account-id'];
    delete req.headers['x-account-role'];

    // Authorization: Bearer 우선, 없으면 access_token 쿠키 폴백.
    const token = bearerToken(req.headers.authorization) ?? cookieToken(req.headers.cookie, 'access_token');
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
