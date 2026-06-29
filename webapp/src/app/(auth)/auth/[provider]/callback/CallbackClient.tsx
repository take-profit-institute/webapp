'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { oauthExchange } from '@/apis/auth';
import { consumeOAuthState } from '@/lib/oauth-state';
import { useAuthStore } from '@/store/useStore';
import type { OAuthProvider } from '@/lib/api-types';

const SUPPORTED: OAuthProvider[] = ['google', 'kakao', 'naver'];

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ fontFamily: 'Noto Sans KR', color: 'var(--text-secondary, #888)' }}>
        로그인 처리 중...
      </p>
    </div>
  );
}

function CallbackContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  // React Strict Mode가 개발환경에서 effect를 두 번 실행함.
  // authorization code는 1회용이므로 두 번째 호출이 provider에서 거부됨 → 가드.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const raw = params?.provider;
    const provider = (Array.isArray(raw) ? raw[0] : raw) as OAuthProvider;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (!SUPPORTED.includes(provider)) {
      router.push('/login?error=unsupported_provider');
      return;
    }
    if (error || !code) {
      router.push(`/login?error=${encodeURIComponent(error ?? 'no_code')}`);
      return;
    }
    // CSRF 방지: 저장한 state와 콜백 state가 일치해야 진행.
    if (!consumeOAuthState(provider, state)) {
      router.push('/login?error=state_mismatch');
      return;
    }

    oauthExchange(provider, code, state ?? undefined)
      .then((result) => {
        setSession(result);
        router.push(result.isNewUser ? '/signup' : '/dashboard');
      })
      .catch((err: unknown) => {
        console.error('[OAuth] code exchange failed:', err);
        router.push('/login?error=auth_failed');
      });
  }, []);

  return <Loading />;
}

export default function OAuthCallbackClient() {
  return (
    <Suspense fallback={<Loading />}>
      <CallbackContent />
    </Suspense>
  );
}
