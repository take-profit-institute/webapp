'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { authApi } from '@/apis';

const steps = ['기본 정보', '투자 성향', '완료'];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [style, setStyle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const investStyles = [
    { id: 'conservative', emoji: '🛡️', label: '안정형', desc: '안전한 우량주 위주 투자' },
    { id: 'balanced', emoji: '⚖️', label: '균형형', desc: '성장주와 가치주를 균형 있게' },
    { id: 'aggressive', emoji: '🚀', label: '공격형', desc: '고수익을 위한 적극적 투자' },
    { id: 'momentum', emoji: '⚡', label: '모멘텀형', desc: '상승 추세 종목에 집중 투자' },
  ];

  const handleNext = async () => {
    setErrorMessage(null);
    // Step 0 → create the account on the BFF before continuing.
    if (step === 0) {
      setSubmitting(true);
      try {
        await authApi.signup({ username, email, password });
        setStep(1);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : '회원가입에 실패했습니다');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (step < 2) setStep(step + 1);
    else router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-void)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.3)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="7" y="1" width="4" height="2" rx="1" fill="var(--amber)" />
              <rect x="6" y="3" width="6" height="10" rx="2" fill="var(--amber)" />
              <rect x="5" y="13" width="8" height="4" rx="2" fill="var(--amber)" opacity="0.6" />
            </svg>
          </div>
          <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'Syne, sans-serif' }}>CANDLE</span>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: i < step ? 'var(--gain)' : i === step ? 'var(--amber)' : 'var(--bg-elevated)',
                    color: i <= step ? '#000' : 'var(--text-muted)',
                    border: i > step ? '1px solid var(--border-normal)' : 'none',
                  }}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className="text-xs mt-1" style={{ color: i === step ? 'var(--amber)' : 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-16 h-px mx-2 mb-4 transition-all" style={{ background: i < step ? 'var(--gain)' : 'var(--border-subtle)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>계정 만들기</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>기본 정보를 입력해주세요</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>닉네임</label>
                <input className="input-dark text-sm" placeholder="투자왕김철수" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>이메일</label>
                <input className="input-dark text-sm" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>비밀번호</label>
                <input className="input-dark text-sm" type="password" placeholder="8자 이상" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>투자 성향</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>나에게 맞는 투자 스타일을 선택하세요</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {investStyles.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className="p-4 rounded-xl text-left transition-all"
                    style={{
                      background: style === s.id ? 'var(--amber-subtle)' : 'var(--bg-surface)',
                      border: `1px solid ${style === s.id ? 'rgba(245,166,35,0.4)' : 'var(--border-normal)'}`,
                    }}
                  >
                    <div className="text-2xl mb-2">{s.emoji}</div>
                    <p className="text-sm font-bold" style={{ color: style === s.id ? 'var(--amber)' : 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{s.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-4 space-y-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>환영합니다!</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                계정이 생성되었습니다.<br />
                1억원의 가상 자산이 지급되었습니다.
              </p>
              <div className="p-4 rounded-xl" style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(245,166,35,0.2)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>지급된 가상 자산</p>
                <p className="text-3xl font-black gradient-text" style={{ fontFamily: 'JetBrains Mono' }}>₩100,000,000</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-xs mt-4 text-center" style={{ color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>{errorMessage}</p>
          )}

          <button onClick={handleNext} disabled={submitting} className="btn-amber w-full py-3 mt-6 text-sm" style={{ opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '처리 중...' : step === 2 ? '투자 시작하기 →' : '다음'}
          </button>

          {step === 0 && (
            <p className="text-center text-sm mt-4" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
              이미 계정이 있으신가요?{' '}
              <Link href="/login" style={{ color: 'var(--amber)' }}>로그인</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
