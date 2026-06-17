'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Bell, Shield, HelpCircle, ChevronRight, TrendingUp, Award, Zap, BookOpen, Target, LogOut } from 'lucide-react';
import Link from 'next/link';
import { logout, resetAccount, updateProfile } from '@/apis';
import type { InvestStyle } from '@/lib/api-types';

const tabs = ['프로필', '투자 통계', '설정'];

/** 한글 라벨 ↔ 백엔드 InvestStyle 매핑. */
const STYLE_TO_ENUM: Record<string, InvestStyle> = {
  '안정형': 'conservative',
  '균형형': 'balanced',
  '공격형': 'aggressive',
  '모멘텀형': 'momentum',
};

const achievements = [
  { emoji: '🎯', label: '첫 거래', earned: true },
  { emoji: '🌏', label: '해외 개척자', earned: true },
  { emoji: '🏆', label: 'TOP 10', earned: true },
  { emoji: '💎', label: '다이아', earned: false },
  { emoji: '🚀', label: '로켓', earned: false },
  { emoji: '👑', label: '랭킹왕', earned: false },
];

export default function MyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('프로필');
  const [investStyle, setInvestStyle] = useState('균형형');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSelectStyle = (label: string) => {
    setInvestStyle(label);
    // Fire-and-forget — UI updates immediately, BFF echoes the change.
    void updateProfile({ investStyle: STYLE_TO_ENUM[label] }).catch(() => {});
  };

  const handleReset = async () => {
    if (!window.confirm('포트폴리오를 초기화하시겠어요? 보유 종목이 모두 정리되고 1억원으로 리셋됩니다.')) return;
    setResetting(true);
    setResetMessage(null);
    try {
      const account = await resetAccount();
      setResetMessage(`초기화 완료 · 가용 현금 ${account.cash.toLocaleString()}원`);
    } catch (e) {
      setResetMessage(e instanceof Error ? e.message : '초기화에 실패했습니다');
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-[900px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>마이페이지</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>내 프로필 및 투자 성과</p>
      </div>

      {/* Profile card */}
      <div className="card p-4 md:p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-3xl md:text-4xl"
              style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-normal)' }}>🐯</div>
            <button className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--amber)', color: '#000' }}>
              <Camera size={10} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h2 className="text-lg md:text-xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>박유빈</h2>
              <span className="badge-amber text-xs">균형형</span>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>가입일: 2026.01.15</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-center">
                <p className="text-base md:text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--amber)' }}>#4</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>랭킹</p>
              </div>
              <div className="w-px h-6" style={{ background: 'var(--border-subtle)' }} />
              <div className="text-center">
                <p className="text-base md:text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--gain)' }}>+18.36%</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>수익률</p>
              </div>
              <div className="w-px h-6" style={{ background: 'var(--border-subtle)' }} />
              <div className="text-center">
                <p className="text-base md:text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--amber)' }}>15,500</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>포인트</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links for mobile — hidden on desktop since sidebar has them */}
      <div className="md:hidden grid grid-cols-2 gap-2 mb-4">
        <Link href="/missions" className="card p-3 flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--amber-subtle)' }}>
            <Target size={15} style={{ color: 'var(--amber)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>미션</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>5개 진행 중</p>
          </div>
        </Link>
        <Link href="/learn" className="card p-3 flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--amber-subtle)' }}>
            <BookOpen size={15} style={{ color: 'var(--amber)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>학습</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>9개 콘텐츠</p>
          </div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-none mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-4 md:px-5 py-3 text-sm font-medium transition-all shrink-0"
            style={{
              color: activeTab === t ? 'var(--amber)' : 'var(--text-secondary)',
              borderBottom: activeTab === t ? '2px solid var(--amber)' : '2px solid transparent',
              fontFamily: 'Noto Sans KR',
            }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === '프로필' && (
        <div className="space-y-4">
          {/* Achievements */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award size={15} style={{ color: 'var(--amber)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>업적</h3>
              <span className="badge-amber ml-auto">3/6 달성</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {achievements.map(a => (
                <div key={a.label} className="p-2.5 md:p-4 rounded-xl text-center transition-all"
                  style={{
                    background: a.earned ? 'var(--amber-subtle)' : 'var(--bg-surface)',
                    border: `1px solid ${a.earned ? 'rgba(245,166,35,0.2)' : 'var(--border-subtle)'}`,
                    opacity: a.earned ? 1 : 0.4,
                  }}>
                  <div className="text-xl md:text-2xl mb-1">{a.emoji}</div>
                  <p className="text-[10px] md:text-xs font-bold" style={{ color: a.earned ? 'var(--amber)' : 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{a.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Invest style */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} style={{ color: 'var(--amber)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>투자 성향</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['안정형', '균형형', '공격형', '모멘텀형'].map(s => (
                <button key={s} onClick={() => handleSelectStyle(s)}
                  className="p-3 rounded-xl text-center transition-all text-sm"
                  style={{
                    background: investStyle === s ? 'var(--amber-subtle)' : 'var(--bg-surface)',
                    border: `1px solid ${investStyle === s ? 'rgba(245,166,35,0.3)' : 'var(--border-subtle)'}`,
                    color: investStyle === s ? 'var(--amber)' : 'var(--text-secondary)',
                    fontFamily: 'Noto Sans KR',
                    fontWeight: investStyle === s ? 700 : 400,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === '투자 통계' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '승률', value: '66.7%', sub: '16승 8패', color: 'var(--gain)' },
              { label: '평균 보유기간', value: '12.4일', sub: '단기 성향', color: 'var(--amber)' },
              { label: '최대 수익 종목', value: '엔비디아', sub: '+34.2%', color: 'var(--gain)' },
              { label: '최대 손실 종목', value: '카카오', sub: '-8.3%', color: 'var(--loss)' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="card p-4">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
                <p className="text-lg md:text-2xl font-black mb-0.5" style={{ fontFamily: 'Syne, sans-serif', color }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Monthly returns bar chart */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: 'var(--amber)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>월별 수익률</h3>
            </div>
            <div className="flex items-end gap-2 h-24">
              {[{ month: '1월', pct: 3.2 }, { month: '2월', pct: -1.4 }, { month: '3월', pct: 5.8 }, { month: '4월', pct: 2.1 }, { month: '5월', pct: -0.8 }, { month: '6월', pct: 4.7 }].map(({ month, pct }) => {
                const isPos = pct >= 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <span className="text-[9px] md:text-xs font-mono" style={{ color: isPos ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {isPos ? '+' : ''}{pct}%
                    </span>
                    <div className="w-full rounded-t-sm" style={{ height: `${Math.abs(pct) * 8}px`, background: isPos ? 'var(--gain)' : 'var(--loss)', opacity: 0.8 }} />
                    <span className="text-[9px] md:text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === '설정' && (
        <div className="space-y-2">
          {[
            { icon: Bell, label: '알림 설정', desc: '시세 알림, 거래 알림' },
            { icon: Shield, label: '보안 설정', desc: '비밀번호, 2단계 인증' },
            { icon: HelpCircle, label: '고객 지원', desc: '자주 묻는 질문, 문의' },
          ].map(({ icon: Icon, label, desc }) => (
            <button key={label} className="w-full card-interactive p-4 flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-surface)' }}>
                <Icon size={16} style={{ color: 'var(--amber)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{desc}</p>
              </div>
              <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          ))}
          <button onClick={handleLogout} className="w-full card-interactive p-4 flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-surface)' }}>
              <LogOut size={16} style={{ color: 'var(--amber)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>로그아웃</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>현재 계정에서 로그아웃</p>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
          <div className="pt-3">
            <button onClick={handleReset} disabled={resetting}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'var(--loss-dim)', color: 'var(--loss)', border: '1px solid rgba(246,70,93,0.2)', fontFamily: 'Noto Sans KR', opacity: resetting ? 0.6 : 1 }}>
              {resetting ? '초기화 중...' : '계정 초기화 (포트폴리오 리셋)'}
            </button>
            {resetMessage && (
              <p className="text-center text-xs mt-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{resetMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
