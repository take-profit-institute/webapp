'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Bell, Shield, HelpCircle, ChevronRight, TrendingUp, Award, Zap, BookOpen, Target, LogOut, Check, X, Pencil, UserMinus, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { checkNickname, getAccount, getMyPageSummary, logout, resetAccount, updateMyProfile, withdraw, useApi } from '@/apis';
import { useAuthStore, useUIStore } from '@/store/useStore';
import { secureTokenStore } from '@/lib/secure-token-store';
import type { InvestStyle } from '@/lib/api-types';

const AVATAR_OPTIONS = ['🐯', '🦊', '🐻', '🐼', '🦁', '🐲', '🚀', '💎', '📈', '👑'];

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
  const { data: account } = useApi(() => getAccount(), []);
  const { data: summary } = useApi(() => getMyPageSummary(), []);
  const isActive = account?.status !== 'inactive';
  const clearSession = useAuthStore((s) => s.clearSession);
  const { theme, toggleTheme } = useUIStore();

  const profile = summary?.profile;
  // Optimistic overrides (BFF is stateless, so edits don't survive a refetch).
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const avatar = avatarOverride ?? profile?.avatar ?? '🐯';
  const displayName = nameOverride ?? profile?.username ?? '박유빈';
  const role = profile?.role ?? 'USER';

  // Avatar picker (USER-010)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  // Nickname edit + duplicate check (USER-008/009)
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [nickCheck, setNickCheck] = useState<{ available: boolean } | null>(null);
  const [savingNick, setSavingNick] = useState(false);
  // Withdraw (USER-004)
  const [withdrawing, setWithdrawing] = useState(false);

  const handleSelectStyle = (label: string) => {
    setInvestStyle(label);
    // Fire-and-forget — UI updates immediately, BFF echoes the change.
    void updateMyProfile({ investStyle: STYLE_TO_ENUM[label] }).catch(() => {});
  };

  const handlePickAvatar = (emoji: string) => {
    setAvatarOverride(emoji);
    setShowAvatarPicker(false);
    void updateMyProfile({ avatar: emoji }).catch(() => {}); // USER-010
  };

  const startEditNick = () => {
    setNickInput(displayName);
    setNickCheck(null);
    setEditingNick(true);
  };

  const handleCheckNick = async () => {
    try {
      const r = await checkNickname(nickInput); // USER-009
      setNickCheck({ available: r.available });
    } catch {
      setNickCheck(null);
    }
  };

  const handleSaveNick = async () => {
    if (!nickCheck?.available) return;
    setSavingNick(true);
    try {
      await updateMyProfile({ username: nickInput }); // USER-008
      setNameOverride(nickInput);
      setEditingNick(false);
    } finally {
      setSavingNick(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('정말 탈퇴하시겠어요? 탈퇴 후에는 로그인할 수 없습니다.')) return;
    setWithdrawing(true);
    try {
      await withdraw(); // USER-004 → status WITHDRAWN
      clearSession();
      router.push('/login');
    } finally {
      setWithdrawing(false);
    }
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
    const rt = await secureTokenStore.getRefreshToken();
    try {
      await logout(rt ?? undefined); // AUTH-010: refresh token 폐기 요청
    } finally {
      clearSession();
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
              style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-normal)' }}>{avatar}</div>
            <button onClick={() => setShowAvatarPicker(v => !v)} title="프로필 이미지 변경"
              className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--amber)', color: '#000' }}>
              <Camera size={10} />
            </button>
            {showAvatarPicker && (
              <div className="absolute z-20 top-full mt-2 left-0 p-2 rounded-xl grid grid-cols-5 gap-1.5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-normal)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                {AVATAR_OPTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handlePickAvatar(emoji)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all"
                    style={{ background: emoji === avatar ? 'var(--amber-subtle)' : 'var(--bg-surface)' }}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              {editingNick ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    value={nickInput}
                    onChange={e => { setNickInput(e.target.value); setNickCheck(null); }}
                    className="input-dark text-sm py-1 px-2 w-36"
                    placeholder="닉네임 (2~20자)"
                  />
                  <button onClick={handleCheckNick} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>중복확인</button>
                  <button onClick={handleSaveNick} disabled={!nickCheck?.available || savingNick} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: nickCheck?.available ? 'var(--gain)' : 'var(--bg-surface)', color: nickCheck?.available ? '#000' : 'var(--text-muted)' }} title="저장"><Check size={13} /></button>
                  <button onClick={() => setEditingNick(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }} title="취소"><X size={13} /></button>
                  {nickCheck && (
                    <span className="text-xs" style={{ color: nickCheck.available ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
                      {nickCheck.available ? '사용 가능' : '이미 사용 중'}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="text-lg md:text-xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>{displayName}</h2>
                  <button onClick={startEditNick} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-muted)' }} title="닉네임 변경"><Pencil size={12} /></button>
                </>
              )}
              <span className="badge-amber text-xs">균형형</span>
              {/* 사용자 권한 (AUTH-011/012) */}
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: role === 'ADMIN' ? 'rgba(139,92,246,0.15)' : 'var(--bg-surface)',
                  color: role === 'ADMIN' ? '#8B5CF6' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'JetBrains Mono',
                }}>
                {role === 'ADMIN' ? '👑 ADMIN' : 'USER'}
              </span>
              {/* 계좌 상태 (ACC-005/006) */}
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: isActive ? 'var(--gain-dim)' : 'var(--loss-dim)',
                  color: isActive ? 'var(--gain)' : 'var(--loss)',
                  fontFamily: 'Noto Sans KR',
                }}>
                {isActive ? '활성 계좌' : '비활성 계좌'}
              </span>
            </div>
            {/* 이메일(USER-011) · 가입일(USER-022) */}
            <p className="text-xs mb-2 truncate" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
              {profile?.email ?? 'demo@candle.app'}
              {profile?.createdAt && <span> · 가입일 {profile.createdAt.slice(0, 10).replace(/-/g, '.')}</span>}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {/* 랭킹(USER-015) · 수익률(USER-013) · 챌린지(USER-016) */}
              <div className="text-center">
                <p className="text-base md:text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--amber)' }}>#{summary?.ranking?.rank ?? '-'}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>랭킹</p>
              </div>
              <div className="w-px h-6" style={{ background: 'var(--border-subtle)' }} />
              <div className="text-center">
                <p className="text-base md:text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--gain)' }}>
                  {summary ? `${summary.performance.totalReturnPercent >= 0 ? '+' : ''}${summary.performance.totalReturnPercent}%` : '—'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>수익률</p>
              </div>
              <div className="w-px h-6" style={{ background: 'var(--border-subtle)' }} />
              <div className="text-center">
                <p className="text-base md:text-lg font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--amber)' }}>
                  {summary ? `${summary.challenges.completed}/${summary.challenges.active + summary.challenges.completed}` : '—'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>챌린지</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 자산 현황 (USER-014) */}
      <div className="card p-4 mb-4 grid grid-cols-3 gap-2">
        {[
          { label: '총 자산', value: summary?.assets.totalAsset, color: 'var(--text-primary)' },
          { label: '주식 평가금', value: summary?.assets.investedAmount, color: 'var(--text-secondary)' },
          { label: '가용 현금', value: summary?.assets.cash, color: 'var(--gain)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
            <p className="text-sm md:text-base font-black font-mono" style={{ fontFamily: 'JetBrains Mono', color }}>
              {value != null ? value.toLocaleString() : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links for mobile — hidden on desktop since sidebar has them */}
      <div className="lg:hidden grid grid-cols-2 gap-2 mb-4">
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
          {/* 화면 테마 토글 */}
          <button
            onClick={toggleTheme}
            className="w-full card-interactive p-4 flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-surface)' }}>
              {theme === 'light'
                ? <Sun size={16} style={{ color: 'var(--amber)' }} />
                : <Moon size={16} style={{ color: 'var(--amber)' }} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>화면 테마</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                {theme === 'light' ? '라이트 모드' : '다크 모드'} 사용 중
              </p>
            </div>
            {/* Toggle switch */}
            <div
              className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
              style={{ background: theme === 'dark' ? 'var(--amber)' : 'var(--border-normal)' }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                style={{ left: theme === 'dark' ? 24 : 4 }}
              />
            </div>
          </button>

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

          {/* 회원 탈퇴 (USER-004) */}
          <div className="pt-2">
            <button onClick={handleWithdraw} disabled={withdrawing}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontFamily: 'Noto Sans KR', opacity: withdrawing ? 0.6 : 1 }}>
              <UserMinus size={14} />
              {withdrawing ? '탈퇴 처리 중...' : '회원 탈퇴'}
            </button>
            <p className="text-center text-[11px] mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
              탈퇴 시 계정이 WITHDRAWN 상태가 되며 더 이상 로그인할 수 없습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
