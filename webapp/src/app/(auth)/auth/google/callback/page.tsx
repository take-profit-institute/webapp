'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { oauthExchange } from '@/apis/auth';
import { useAuthStore } from '@/store/useStore';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  // React Strict Mode가 개발환경에서 effect를 두 번 실행함.
  // authorization code는 1회용이므로 두 번째 호출이 Google에서 거부됨 → 가드.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

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
      .catch((err: unknown) => {
        console.error('[OAuth] code exchange failed:', err);
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
