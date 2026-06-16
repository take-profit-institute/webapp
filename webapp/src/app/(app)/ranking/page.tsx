'use client';
import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Crown } from 'lucide-react';
import { getRankings, getMyRanking, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';

const periods = ['오늘', '이번 주', '이번 달', '전체'];

export default function RankingPage() {
  const [period, setPeriod] = useState('이번 달');

  const { data, loading, error, refetch } = useApi(() => getRankings(), []);
  const { data: myRanking } = useApi(() => getMyRanking(), []);
  const rankings = data ?? [];

  return (
    <div className="p-3 md:p-6 max-w-[900px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>랭킹</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>수익률 기준 순위</p>
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && rankings.length >= 3 && (
      <>
      {/* My rank banner */}
      {myRanking && (
      <div className="card p-4 mb-4" style={{ border: '1px solid rgba(245,166,35,0.3)', background: 'var(--amber-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-xl md:text-2xl shrink-0"
            style={{ background: 'var(--bg-card)' }}>{myRanking.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--amber)' }}>#{myRanking.rank}</span>
              <span className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{myRanking.username}</span>
              <span className={`text-xs ${myRanking.dayChangePercent >= 0 ? 'badge-gain' : 'badge-loss'}`}>
                {myRanking.dayChangePercent >= 0 ? '▲' : '▼'} {Math.abs(myRanking.dayChangePercent)}%p
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>전체 {rankings.length.toLocaleString()}명 중</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl md:text-2xl font-black" style={{ fontFamily: 'JetBrains Mono', color: 'var(--gain)' }}>+{myRanking.returnPercent}%</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>총 수익률</p>
          </div>
        </div>
      </div>
      )}

      {/* Period filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {periods.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0"
            style={{
              background: period === p ? 'var(--amber)' : 'var(--bg-card)',
              color: period === p ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${period === p ? 'var(--amber)' : 'var(--border-subtle)'}`,
              fontFamily: 'Noto Sans KR',
            }}>
            {p}
          </button>
        ))}
      </div>

      {/* Podium — compact on mobile */}
      <div className="flex items-end justify-center gap-3 md:gap-4 mb-5 py-4">
        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-3xl mb-1">{rankings[1].avatar}</div>
          <p className="text-xs font-medium mb-1.5 text-center" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{rankings[1].username}</p>
          <div className="w-16 md:w-20 h-12 md:h-16 rounded-t-xl flex flex-col items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-normal)' }}>
            <span className="text-lg md:text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-secondary)' }}>2</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--gain)' }}>+{rankings[1].returnPercent}%</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <Crown size={16} className="mb-1" style={{ color: '#FFD700' }} />
          <div className="text-3xl md:text-4xl mb-1">{rankings[0].avatar}</div>
          <p className="text-xs font-bold mb-1.5 text-center" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{rankings[0].username}</p>
          <div className="w-20 md:w-24 h-16 md:h-24 rounded-t-xl flex flex-col items-center justify-center"
            style={{ background: 'var(--amber-glow)', border: '1px solid rgba(245,166,35,0.4)' }}>
            <span className="text-2xl md:text-3xl font-black gradient-text" style={{ fontFamily: 'Syne, sans-serif' }}>1</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--gain)' }}>+{rankings[0].returnPercent}%</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-3xl mb-1">{rankings[2].avatar}</div>
          <p className="text-xs font-medium mb-1.5 text-center" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{rankings[2].username}</p>
          <div className="w-16 md:w-20 h-9 md:h-12 rounded-t-xl flex flex-col items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-normal)' }}>
            <span className="text-lg md:text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: '#CD7F32' }}>3</span>
          </div>
        </div>
      </div>

      {/* Rankings list */}
      <div className="card overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid text-xs px-5 py-3" style={{
          gridTemplateColumns: '48px 2fr 1fr 1fr 1fr',
          color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'Noto Sans KR',
        }}>
          <span>순위</span><span>투자자</span><span className="text-right">수익률</span>
          <span className="text-right">총 자산</span><span className="text-right">변동</span>
        </div>

        {rankings.map((user, i) => {
          const isMe = !!myRanking && user.userId === myRanking.userId;
          const medalEmoji = ['🥇', '🥈', '🥉'][user.rank - 1];
          return (
            <div key={user.rank}
              className="flex md:grid items-center px-4 md:px-5 py-3 md:py-3.5 transition-colors gap-3"
              style={{
                gridTemplateColumns: '48px 2fr 1fr 1fr 1fr',
                borderBottom: i < rankings.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                background: isMe ? 'var(--amber-subtle)' : 'transparent',
              }}
              onMouseEnter={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isMe ? 'var(--amber-subtle)' : 'transparent'; }}
            >
              {/* Rank */}
              <div className="shrink-0 w-8 md:w-auto text-center">
                <span className="text-sm font-black" style={{
                  fontFamily: 'Syne, sans-serif',
                  color: user.rank === 1 ? '#FFD700' : user.rank === 2 ? '#C0C0C0' : user.rank === 3 ? '#CD7F32' : isMe ? 'var(--amber)' : 'var(--text-muted)',
                }}>
                  {user.rank <= 3 ? medalEmoji : `#${user.rank}`}
                </span>
              </div>

              {/* User */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-base md:text-lg shrink-0"
                  style={{ background: 'var(--bg-surface)' }}>{user.avatar}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: isMe ? 'var(--amber)' : 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
                      {user.username}
                    </span>
                    {isMe && <span className="badge-amber" style={{ fontSize: 9, padding: '0 4px' }}>나</span>}
                    {user.badge && <span className="badge-amber hidden sm:inline" style={{ fontSize: 9, padding: '0 4px' }}>{user.badge}</span>}
                  </div>
                  {/* Mobile: show return on same row */}
                  <div className="flex items-center gap-2 md:hidden">
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono' }}>+{user.returnPercent}%</span>
                    <div className="flex items-center gap-0.5">
                      {user.dayChangePercent >= 0 ? <ArrowUpRight size={10} style={{ color: 'var(--gain)' }} /> : <ArrowDownRight size={10} style={{ color: 'var(--loss)' }} />}
                      <span className="text-[10px] font-mono" style={{ color: user.dayChangePercent >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{user.dayChangePercent >= 0 ? '+' : ''}{user.dayChangePercent}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop-only columns */}
              <div className="hidden md:flex items-center justify-end">
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono' }}>+{user.returnPercent}%</span>
              </div>
              <div className="hidden md:flex items-center justify-end">
                <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{(user.totalAsset / 100000000).toFixed(1)}억</span>
              </div>
              <div className="hidden md:flex items-center justify-end gap-1">
                {user.dayChangePercent >= 0 ? <ArrowUpRight size={12} style={{ color: 'var(--gain)' }} /> : <ArrowDownRight size={12} style={{ color: 'var(--loss)' }} />}
                <span className="text-xs font-mono" style={{ color: user.dayChangePercent >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                  {user.dayChangePercent >= 0 ? '+' : ''}{user.dayChangePercent}%
                </span>
              </div>

              {/* Mobile: asset on right */}
              <div className="md:hidden shrink-0 text-right">
                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{(user.totalAsset / 100000000).toFixed(1)}억</p>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
