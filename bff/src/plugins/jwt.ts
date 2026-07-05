import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtClaims {
  sub: string;
  role: string;
  exp?: number;
  email?: string;
}

/**
 * auth-service가 HS256(공유 HMAC 시크릿)으로 서명한 access token을 검증한다.
 * 외부 JWT 라이브러리 없이 Node crypto만으로 서명·만료·alg를 확인한다.
 * 유효하지 않으면 null.
 */
export function verifyHs256(token: string, secret: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string };
  let payload: { sub?: unknown; role?: unknown; exp?: unknown; email?: unknown };
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (header.alg !== 'HS256') return null;

  const expected = createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureB64, 'base64url');
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  if (typeof payload.sub !== 'string') return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp <= now) return null;

  return {
    sub: payload.sub,
    role: typeof payload.role === 'string' ? payload.role : '',
    exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}
