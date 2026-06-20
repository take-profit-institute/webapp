export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

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

export const apiClient = {
  get: <T>(path: string, query?: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (query) Object.entries(query).forEach(([k, v]) => { if (v != null) params.set(k, v); });
    const qs = params.toString();
    return request<T>(`${path}${qs ? `?${qs}` : ''}`);
  },
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body != null ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
