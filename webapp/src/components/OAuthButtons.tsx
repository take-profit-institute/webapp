'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getProviders, oauthLogin, useApi } from '@/apis';
import { useAuthStore } from '@/store/useStore';
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
