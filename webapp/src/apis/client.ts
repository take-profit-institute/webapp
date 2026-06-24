/**
 * Thin fetch wrapper around the Candle BFF.
 *
 * Every request goes through here so swapping the mock BFF for real data later
 * is a config change (`NEXT_PUBLIC_API_BASE_URL`), not a code change. Domain
 * modules (market/account/auth/social) build on top of this and never call
 * `fetch` directly.
 */

import { IDEMPOTENCY_HEADER, newIdempotencyKey } from '@/lib/idempotency';

/** BFF origin. Inlined at build time by Next (static export), so it must be `NEXT_PUBLIC_*`. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

/** Gateway origin for auth endpoints. Falls back to BFF when not set (mock dev mode). */
export const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, '') ?? API_BASE_URL;

/** Error thrown for any non-2xx response, carrying the BFF's error envelope when present. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Query-string params; `undefined`/`null` entries are dropped. */
  query?: Query;
  /** JSON request body (serialized automatically). */
  body?: unknown;
}

// ── Auth wiring (set by the auth store, kept here to avoid a React dependency) ──
let tokenGetter: (() => string | null) | null = null;
let tokenRefresher: (() => Promise<string | null>) | null = null;

/** Register how to read the current access token (Authorization header). */
export function setAuthTokenGetter(fn: (() => string | null) | null): void {
  tokenGetter = fn;
}

/** Register how to refresh the access token when a request gets a 401 (AUTH-007/009). */
export function setTokenRefresher(fn: (() => Promise<string | null>) | null): void {
  tokenRefresher = fn;
}

/** Auth endpoints must not trigger the 401→refresh interceptor (avoids loops). */
function isAuthPath(path: string): boolean {
  return path.startsWith('/api/auth/');
}

function buildUrl(base: string, path: string, query?: Query): string {
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Core request helper. Returns parsed JSON typed as `T`; throws {@link ApiError} on failure. */
export async function request<T>(path: string, options: RequestOptions = {}, allowRetry = true, baseUrl = API_BASE_URL): Promise<T> {
  const { query, body, headers, ...init } = options;
  const token = tokenGetter?.();

  const res = await fetch(buildUrl(baseUrl, path, query), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // AUTH-009: on 401, try a one-time token refresh and replay the request.
  if (res.status === 401 && allowRetry && tokenRefresher && !isAuthPath(path)) {
    const refreshed = await tokenRefresher();
    if (refreshed) return request<T>(path, options, false, baseUrl);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && String(payload.message)) ||
      `Request failed: ${res.status} ${res.statusText}`;
    throw new ApiError(res.status, message, payload);
  }

  // 204 No Content (e.g. DELETE) has no body.
  if (res.status === 204) return undefined as T;

  return payload as T;
}

/**
 * 쓰기 메서드의 Idempotency-Key 헤더를 만든다.
 * 호출당 한 번 생성해 options.headers에 싣는다 → request의 내부 401 재시도가 같은 키를 보존한다.
 * 이중탭/앱 재시작 재전송까지 막으려면 호출부가 의도 단위 키(`useIdempotencyKey`)를 넘긴다.
 */
function idempotencyHeaders(key?: string): Record<string, string> {
  return { [IDEMPOTENCY_HEADER]: key ?? newIdempotencyKey() };
}

/** Auth request — uses AUTH_BASE_URL (gateway) with no 401 retry to avoid loops. */
export function authRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, false, AUTH_BASE_URL);
}

export const authApiClient = {
  get: <T>(path: string, query?: Query) => authRequest<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    authRequest<T>(path, { method: 'POST', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  patch: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    authRequest<T>(path, { method: 'PATCH', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  del: <T = void>(path: string, query?: Query, idempotencyKey?: string) =>
    authRequest<T>(path, { method: 'DELETE', query, headers: idempotencyHeaders(idempotencyKey) }),
};

export const apiClient = {
  get: <T>(path: string, query?: Query) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'POST', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  patch: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'PATCH', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  put: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'PUT', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  del: <T = void>(path: string, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'DELETE', query, headers: idempotencyHeaders(idempotencyKey) }),
};
