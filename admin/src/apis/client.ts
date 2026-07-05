// 로컬 개발 기본값은 API 게이트웨이(:8000). 게이트웨이가 JWT 검증 후 BFF(:8080)로 프록시한다.
// (BFF를 직접 :4000으로 치면 게이트웨이 인증/헤더 주입을 우회하고, 로컬에서 4000이 안 떠 있으면
//  브라우저에 CORS 실패로 표시된다.)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

let getToken: (() => string | null) | null = null;
export function setTokenGetter(fn: () => string | null) { getToken = fn; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken?.();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) } });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.message ?? res.statusText, data);
  return data as T;
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function writeOptions(method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): RequestInit {
  return {
    method,
    body: body != null ? JSON.stringify(body) : undefined,
    headers: { 'Idempotency-Key': idempotencyKey() },
  };
}

export const apiClient = {
  get: <T>(path: string, query?: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (query) Object.entries(query).forEach(([k, v]) => { if (v != null) params.set(k, v); });
    const qs = params.toString();
    return request<T>(`${path}${qs ? `?${qs}` : ''}`);
  },
  post: <T>(path: string, body?: unknown) => request<T>(path, writeOptions('POST', body)),
  patch: <T>(path: string, body?: unknown) => request<T>(path, writeOptions('PATCH', body)),
  del: <T>(path: string) => request<T>(path, writeOptions('DELETE')),
};
