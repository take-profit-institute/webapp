import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { IDEMPOTENCY_HEADER, newIdempotencyKey } from '@/lib/idempotency';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

export const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, '') ?? API_BASE_URL;

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

interface RequestOptions {
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
}

// ── Auth wiring ──────────────────────────────────────────────────────────────
let tokenGetter: (() => string | null) | null = null;
let tokenRefresher: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: (() => string | null) | null): void {
  tokenGetter = fn;
}

export function setTokenRefresher(fn: (() => Promise<string | null>) | null): void {
  tokenRefresher = fn;
}

function isAuthPath(path: string): boolean {
  return path.startsWith('/api/auth/');
}

function buildUrl(base: string, path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function cleanQuery(query?: Query): Record<string, string> | undefined {
  if (!query) return undefined;
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  );
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
  allowRetry = true,
  baseUrl = API_BASE_URL,
): Promise<T> {
  const { query, body, headers, method = 'GET' } = options;
  const token = tokenGetter?.();

  const config: AxiosRequestConfig = {
    url: buildUrl(baseUrl, path),
    method,
    withCredentials: true,
    params: cleanQuery(query),
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { data: body } : {}),
  };

  try {
    const res = await axios.request<T>(config);
    return res.data;
  } catch (err) {
    if (!(err instanceof AxiosError) || !err.response) throw err;

    const { status, data } = err.response;

    // AUTH-009: 401 시 토큰 갱신 후 1회 재시도
    if (status === 401 && allowRetry && tokenRefresher && !isAuthPath(path)) {
      const refreshed = await tokenRefresher();
      if (refreshed) return request<T>(path, options, false, baseUrl);
    }

    const message =
      (data && typeof data === 'object' && 'message' in data && String(data.message)) ||
      `Request failed: ${status}`;
    throw new ApiError(status, message, data);
  }
}

function idempotencyHeaders(key?: string): Record<string, string> {
  return { [IDEMPOTENCY_HEADER]: key ?? newIdempotencyKey() };
}

export function authRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options, false, AUTH_BASE_URL);
}

export const authApiClient = {
  get: <T>(path: string, query?: Query) =>
    authRequest<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    authRequest<T>(path, { method: 'POST', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  patch: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    authRequest<T>(path, { method: 'PATCH', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  del: <T = void>(path: string, query?: Query, idempotencyKey?: string) =>
    authRequest<T>(path, { method: 'DELETE', query, headers: idempotencyHeaders(idempotencyKey) }),
};

export const apiClient = {
  get: <T>(path: string, query?: Query) =>
    request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'POST', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  patch: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'PATCH', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  put: <T>(path: string, body?: unknown, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'PUT', body, query, headers: idempotencyHeaders(idempotencyKey) }),
  del: <T = void>(path: string, query?: Query, idempotencyKey?: string) =>
    request<T>(path, { method: 'DELETE', query, headers: idempotencyHeaders(idempotencyKey) }),
};
