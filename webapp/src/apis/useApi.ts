'use client';
import { useCallback, useEffect, useState } from 'react';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Re-run the fetcher (e.g. after a mutation). */
  refetch: () => void;
}

/**
 * Client-side data fetching for the static-exported app.
 *
 * The webapp is exported as a static bundle (Capacitor), so there is no server
 * to fetch on — pages call the BFF from the browser via this hook.
 *
 *   const { data, loading, error } = useApi(() => getStocks({ limit: 20 }), []);
 *
 * `deps` controls when the fetcher re-runs, exactly like `useEffect` deps.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: React.DependencyList = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, refetch };
}
