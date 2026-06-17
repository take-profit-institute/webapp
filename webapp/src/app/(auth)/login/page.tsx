'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { authApi } from '@/apis';
import OAuthButtons from '@/components/OAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '로그인에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-void)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>
        {/* Ambient */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, var(--amber) 0%, transparent 70%)' }} />
        </div>

        <div className="relative flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="7" y="1" width="4" height="2" rx="1" fill="var(--amber)" />
              <rect x="6" y="3" width="6" height="10" rx="2" fill="var(--amber)" />
              <rect x="5" y="13" width="8" height="4" rx="2" fill="var(--amber)" opacity="0.6" />
            </svg>
          </div>
          <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'Syne, sans-serif' }}>CANDLE</span>
        </div>

        <div className="relative">
          <p className="text-xs font-mono mb-6 tracking-widest" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>TODAY&apos;S MARKET</p>
          <div className="space-y-3">
            {[
              { name: '삼성전자', price: '71,400', change: '+1.13%', up: true },
              { name: 'SK하이닉스', price: '198,500', change: '-1.24%', up: false },
              { name: '엔비디아', price: '875,200', change: '+2.15%', up: true },
              { name: 'NAVER', price: '168,000', change: '-1.75%', up: false },
            ].map(s => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <TrendingUp size={14} style={{ color: s.up ? 'var(--gain)' : 'var(--loss)' }} />
                  <span className="text-sm" style={{ fontFamily: 'Noto Sans KR', color: 'var(--text-primary)' }}>{s.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{s.price}</p>
                  <p className="text-xs font-mono" style={{ color: s.up ? 'var(--gain)' : 'var(--loss)' }}>{s.change}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
          모든 데이터는 실제 시장 데이터를 기반으로 합니다
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              다시 오셨군요
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
              계정에 로그인하여 투자를 계속하세요
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>이메일</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-dark text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-dark text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" className="text-xs" style={{ color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>
                  비밀번호 찾기
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs" style={{ color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>{errorMessage}</p>
            )}

            <button type="submit" disabled={submitting} className="btn-amber w-full text-sm py-3 mt-2" style={{ opacity: submitting ? 0.6 : 1 }}>
              {submitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>소셜 계정으로 로그인</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          </div>

          <OAuthButtons scenario="existing" redirectTo="/dashboard" />

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
            계정이 없으신가요?{' '}
            <Link href="/signup" style={{ color: 'var(--amber)' }}>회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
