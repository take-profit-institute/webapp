'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { oauthExchange } from '@/apis/auth';
import { useAuthStore } from '@/store/useStore';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      router.push(`/login?error=${encodeURIComponent(error ?? 'no_code')}`);
      return;
    }

    oauthExchange('google', code)
      .then((result) => {
        setSession(result);
        router.push(result.isNewUser ? '/signup' : '/dashboard');
      })
      .catch(() => {
        router.push('/login?error=auth_failed');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ fontFamily: 'Noto Sans KR', color: 'var(--text-secondary, #888)' }}>
        로그인 처리 중...
      </p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p style={{ fontFamily: 'Noto Sans KR', color: 'var(--text-secondary, #888)' }}>
            로그인 처리 중...
          </p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
