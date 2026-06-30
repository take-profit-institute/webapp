'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getProviders, oauthLogin, useApi } from '@/apis';
import { oauthExchange } from '@/apis/auth';
import { useAuthStore } from '@/store/useStore';
import { createOAuthState, consumeOAuthState } from '@/lib/oauth-state';
import { isNativePlatform, runNativeOAuth, NATIVE_OAUTH_REDIRECT_URI } from '@/lib/native-oauth';
import type { OAuthProvider, ProviderInfo } from '@/lib/api-types';

/** Fallback if the providers fetch fails (offline BFF) — keeps the buttons usable. */
const FALLBACK: ProviderInfo[] = [
  { id: 'google', name: 'Google', color: '#4285F4' },
  { id: 'kakao', name: '카카오', color: '#FEE500' },
  { id: 'naver', name: '네이버', color: '#03C75A' },
];

/** Kakao's yellow needs dark text; the rest use white. */
function textColor(provider: OAuthProvider): string {
  return provider === 'kakao' ? '#191919' : '#ffffff';
}

interface Props {
  /** Mock scenario: signup pages pass `new` to exercise auto-signup (AUTH-002). */
  scenario?: 'existing' | 'new';
  redirectTo?: string;
}

export default function OAuthButtons({ scenario = 'existing', redirectTo = '/dashboard' }: Props) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const { data } = useApi(() => getProviders(), []);
  const providers = data ?? FALLBACK;

  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (provider: OAuthProvider) => {
    const providerInfo = providers.find((p) => p.id === provider);

    // Real OAuth: redirect browser to the provider consent screen.
    // CSRF state는 프론트가 생성·검증한다(백엔드 stateless). state를 저장하고 URL에 붙인 뒤
    // 콜백(/auth/{provider}/callback)에서 ?code=...&state=... 를 받아 검증한다.
    if (providerInfo?.authorizationUrl) {
      const state = createOAuthState(provider);
      const url = new URL(providerInfo.authorizationUrl);
      url.searchParams.set('state', state);

      // 네이티브: 시스템 브라우저로 동의 → 딥링크 콜백 → 같은 WebView에서 코드 교환.
      // (웹과 달리 페이지 이동이 없으므로 콜백 라우트를 거치지 않고 여기서 처리)
      if (isNativePlatform()) {
        setLoading(provider);
        setError(null);
        try {
          const { code, state: returnedState, error: cbError } = await runNativeOAuth(url.toString());
          if (cbError === 'cancelled') {
            setLoading(null);
            return;
          }
          if (cbError || !code) {
            setError('로그인이 취소되었거나 실패했습니다');
            setLoading(null);
            return;
          }
          if (!consumeOAuthState(provider, returnedState)) {
            setError('보안 검증에 실패했습니다. 다시 시도해주세요');
            setLoading(null);
            return;
          }
          const result = await oauthExchange(provider, code, returnedState ?? undefined, NATIVE_OAUTH_REDIRECT_URI);
          setSession(result);
          router.push(result.isNewUser ? '/signup' : redirectTo);
        } catch (e) {
          setError(e instanceof Error ? e.message : '로그인에 실패했습니다');
          setLoading(null);
        }
        return;
      }

      // 웹: 브라우저를 provider 동의 화면으로 이동 → /auth/{provider}/callback에서 교환
      window.location.assign(url.toString());
      return;
    }

    // Mock fallback (DATA_SOURCE=mock — no backend required)
    setLoading(provider);
    setError(null);
    try {
      const result = await oauthLogin(provider, scenario);
      setSession(result);
      router.push(redirectTo);
    } catch (e) {
      // AUTH-014: suspended accounts come back as 403 with a message.
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다');
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handle(p.id)}
          disabled={loading !== null}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            background: p.color,
            color: textColor(p.id),
            opacity: loading !== null && loading !== p.id ? 0.5 : 1,
            border: p.id === 'kakao' ? 'none' : '1px solid rgba(0,0,0,0.06)',
            fontFamily: 'Noto Sans KR',
          }}
        >
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black"
            style={{ background: textColor(p.id), color: p.color }}>
            {p.name.charAt(0)}
          </span>
          {loading === p.id ? '연결 중...' : `${p.name}로 ${scenario === 'new' ? '시작하기' : '계속하기'}`}
        </button>
      ))}
      {error && (
        <p className="text-xs text-center pt-1" style={{ color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>{error}</p>
      )}
    </div>
  );
}
