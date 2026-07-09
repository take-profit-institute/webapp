'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/apis';

/**
 * 전역 React Query Provider.
 *
 * 데이터 패칭 자체는 기존 `apiClient`(axios + auth 인터셉터)가 계속 담당한다.
 * React Query 는 그 위에 캐싱/중복요청 dedup/백그라운드 refetch/로딩·에러 상태만 얹는다.
 * (401→refresh 재시도는 apiClient 내부에서 이미 처리되므로 여기서 건드리지 않는다.)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // apiClient 가 이미 401→refresh 재시도를 처리한다. 따라서 4xx 는 재시도하지
            // 않고(401 무한 재시도·refresh 폭주 방지), 5xx/네트워크 오류만 최대 2회 재시도.
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
              failureCount < 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
