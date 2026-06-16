'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { getMissions, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';

const categories = ['전체', '일일', '주간', '특별'];

export default function MissionsPage() {
  const [activeCategory, setActiveCategory] = useState('전체');

  const { data, loading, error, refetch } = useApi(() => getMissions(), []);
  const missions = data ?? [];

  const filtered = missions.filter(m => {
    if (activeCategory === '전체') return true;
    const map: Record<string, string> = { '일일': 'daily', '주간': 'weekly', '특별': 'special' };
    return m.category === map[activeCategory];
  });

  const totalPoints = missions.filter(m => m.completed).reduce((s, m) => s + m.reward, 0);
  const completedCount = missions.filter(m => m.completed).length;

  return (
    <div className="p-3 md:p-6 max-w-[900px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>미션 & 챌린지</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>미션을 완수하고 포인트를 획득하세요</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
        {[
          { value: totalPoints.toLocaleString(), label: '포인트', colored: true },
          { value: String(completedCount), label: '완료', colored: false },
          { value: String(missions.length - completedCount), label: '진행 중', colored: false },
        ].map(({ value, label, colored }) => (
          <div key={label} className="card p-3 md:p-4 text-center">
            <p className={`text-xl md:text-3xl font-black mb-0.5 ${colored ? 'gradient-text' : ''}`}
              style={{ fontFamily: 'Syne, sans-serif', color: colored ? undefined : 'var(--text-primary)' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Reset timer */}
      <div className="p-3 md:p-4 rounded-xl mb-4 flex items-center justify-between"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <p className="text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>일일 미션 초기화까지</p>
        </div>
        <div className="text-base md:text-xl font-black font-mono" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>08:24:31</div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0"
            style={{
              background: activeCategory === c ? 'var(--amber)' : 'var(--bg-card)',
              color: activeCategory === c ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${activeCategory === c ? 'var(--amber)' : 'var(--border-subtle)'}`,
              fontFamily: 'Noto Sans KR',
            }}>
            {c}
          </button>
        ))}
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {/* Mission cards */}
      {!loading && !error && (
      <div className="space-y-2 md:space-y-3">
        {(['daily', 'weekly', 'special'] as const).filter(cat => {
          if (activeCategory !== '전체') {
            const map: Record<string, string> = { '일일': 'daily', '주간': 'weekly', '특별': 'special' };
            return cat === map[activeCategory];
          }
          return true;
        }).map(cat => {
          const catMissions = filtered.filter(m => m.category === cat);
          if (!catMissions.length) return null;
          const catLabel = { daily: '📅 일일 미션', weekly: '📆 주간 미션', special: '⭐ 특별 미션' }[cat];

          return (
            <div key={cat}>
              <h2 className="text-xs font-bold mb-2 mt-4 first:mt-0" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{catLabel}</h2>
              <div className="space-y-2">
                {catMissions.map(mission => (
                  <div key={mission.id} className="card p-3 md:p-4"
                    style={{ borderColor: mission.completed ? 'rgba(14,203,129,0.2)' : undefined }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-lg md:text-xl shrink-0"
                        style={{ background: mission.completed ? 'var(--gain-dim)' : 'var(--bg-surface)' }}>
                        {mission.completed ? '✅' : mission.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <p className="text-sm font-bold" style={{ color: mission.completed ? 'var(--gain)' : 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
                            {mission.title}
                          </p>
                          {mission.completed && (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--gain)' }}>
                              <Check size={9} color="#000" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{mission.description}</p>
                        {!mission.completed && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                                <div className="h-full rounded-full" style={{ width: `${(mission.progress / mission.total) * 100}%`, background: 'var(--amber)' }} />
                              </div>
                              <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                                {mission.progress}/{mission.total}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(245,166,35,0.2)' }}>
                        <span className="text-xs">🪙</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>+{mission.reward.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
