import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';

export interface JwtClaims {
  sub: string;
  role: string;
  exp?: number;
  email?: string;
}

/**
 * auth-service가 RS256으로 서명한 access token을 JWKS(공개키)로 검증한다.
 * auth-service의 /.well-known/jwks.json에서 공개키를 받아 서명·만료(exp)·issuer·audience를 확인한다.
 * JWKS는 jose가 캐시/리프레시한다. 유효하지 않으면 null.
 */
const jwks = createRemoteJWKSet(new URL(env.authJwksUri));

export async function verifyToken(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.authJwtIssuer || undefined,
      audience: env.authJwtAudience || undefined,
    });
    if (typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      role: typeof payload.role === 'string' ? payload.role : '',
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}
