import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Image from "next/image";

const features = [
  { emoji: '📊', title: '실시간 시세', desc: '실제 시장 데이터를 기반으로 한 실시간 주가 정보' },
  { emoji: '💰', title: '모의 계좌', desc: '1억원의 가상 자산으로 실전 같은 투자 연습' },
  { emoji: '🏆', title: '랭킹 경쟁', desc: '다른 투자자들과 수익률을 겨루며 동기 부여' },
  { emoji: '🎯', title: '미션 시스템', desc: '투자 미션 완수로 포인트를 쌓고 전략을 학습' },
  { emoji: '📚', title: '학습 콘텐츠', desc: '초보자부터 고수까지 수준별 투자 교육 콘텐츠' },
  { emoji: '📈', title: '성과 분석', desc: '나의 투자 패턴과 수익률을 정밀하게 분석' },
];

const stats = [
  { value: '12,480+', label: '활성 사용자' },
  { value: '47조+', label: '누적 거래액' },
  { value: '98.7%', label: '사용자 만족도' },
  { value: '0원', label: '실제 손실 위험' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, var(--amber) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-4 md:px-8 py-4 md:py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-1.png"
            alt="CANDLE"
            width={32}
            height={32}
          />

          <span
            className="text-xl font-bold tracking-wider gradient-text"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
    CANDLE
  </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle chip className="w-9 h-9 justify-center" />
          <Link href="/login" className="btn-outline text-sm px-5 py-2">로그인</Link>
          <Link href="/signup" className="btn-amber text-sm px-5 py-2">무료 시작</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-20 md:pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-sm"
          style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(245,166,35,0.2)', color: 'var(--amber)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--amber)' }} />
          실시간 시장 데이터 연동 중
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-4 md:mb-6 leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
          <span style={{ color: 'var(--text-primary)' }}>투자를 배우는</span>
          <br />
          <span className="gradient-text">가장 안전한 방법</span>
        </h1>

        <p className="text-base md:text-xl max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed px-4" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR, sans-serif' }}>
          실제 시장 데이터로 모의투자를 경험하고,<br className="hidden sm:block" />
          랭킹과 미션으로 투자 실력을 키우세요.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup" className="btn-amber text-base px-8 py-3.5 inline-block w-full sm:w-auto text-center">
            1억원으로 시작하기 →
          </Link>
          <Link href="/dashboard" className="btn-outline text-base px-8 py-3.5 inline-block w-full sm:w-auto text-center">
            둘러보기
          </Link>
        </div>

        {/* Mock preview */}
        <div className="relative mt-20 mx-auto max-w-4xl">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-normal)', background: 'var(--bg-surface)', boxShadow: '0 40px 120px rgba(245,166,35,0.08)' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
              <div className="flex-1 mx-4">
                <div className="mx-auto w-48 h-5 rounded" style={{ background: 'var(--bg-elevated)' }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-0">
              <div className="col-span-1 p-4" style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg mb-1">
                    <div className="w-4 h-4 rounded" style={{ background: i === 0 ? 'rgba(245,166,35,0.3)' : 'var(--bg-elevated)' }} />
                    <div className="h-3 rounded flex-1" style={{ background: i === 0 ? 'rgba(245,166,35,0.1)' : 'var(--bg-elevated)' }} />
                  </div>
                ))}
              </div>
              <div className="col-span-2 p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                      <div className="h-2 w-16 rounded mb-2" style={{ background: 'var(--bg-elevated)' }} />
                      <div className="h-5 w-24 rounded" style={{ background: i % 2 === 0 ? 'rgba(245,166,35,0.15)' : 'var(--bg-elevated)' }} />
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', height: 100 }}>
                  <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5A623" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points="0,70 40,60 80,50 120,55 160,38 200,30 240,20 280,15 320,8 360,3 400,0 400,80 0,80" fill="url(#heroGrad)" />
                    <polyline points="0,70 40,60 80,50 120,55 160,38 200,30 240,20 280,15 320,8 360,3 400,0" fill="none" stroke="#F5A623" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-12 blur-2xl opacity-20 rounded-full" style={{ background: 'var(--amber)' }} />
        </div>
      </section>

      {/* Stats */}
      <section className="py-16" style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black mb-1 gradient-text" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>왜 Candle인가요?</h2>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>단순한 모의투자를 넘어선, 진짜 투자 교육 플랫폼</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ emoji, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="text-3xl mb-4">{emoji}</div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Noto Sans KR', color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-8 pb-24 text-center">
        <div className="p-10 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-normal)', boxShadow: '0 0 60px rgba(245,166,35,0.06)' }}>
          <h2 className="text-3xl font-black mb-3" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>지금 바로 시작하세요</h2>
          <p className="mb-8 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>가입 즉시 1억원의 가상 자산이 지급됩니다</p>
          <Link href="/signup" className="btn-amber text-base px-10 py-3.5 inline-block">무료로 시작하기</Link>
        </div>
      </section>

      <footer className="text-center py-8" style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontFamily: 'Noto Sans KR', fontSize: 13 }}>
        © 2026 Candle. 본 서비스의 모든 투자는 가상 자산으로만 이루어집니다.
      </footer>
    </div>
  );
}
