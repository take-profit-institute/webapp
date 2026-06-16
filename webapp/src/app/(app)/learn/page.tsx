'use client';
import { useState } from 'react';
import { Clock, Eye, BookOpen } from 'lucide-react';
import { getLearnContents, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';

const levels = ['전체', '초급', '중급', '고급'];
const categories = ['전체', '기술적분석', '기본적분석', '투자전략', '고급전략'];

const levelColors: Record<string, { bg: string; color: string; label: string }> = {
  beginner: { bg: 'rgba(14,203,129,0.1)', color: 'var(--gain)', label: '초급' },
  intermediate: { bg: 'rgba(245,166,35,0.1)', color: 'var(--amber)', label: '중급' },
  advanced: { bg: 'rgba(246,70,93,0.1)', color: 'var(--loss)', label: '고급' },
};

export default function LearnPage() {
  const [activeLevel, setActiveLevel] = useState('전체');
  const [activeCategory, setActiveCategory] = useState('전체');

  const { data, loading, error, refetch } = useApi(() => getLearnContents(), []);
  const learnContents = data ?? [];

  const levelMap: Record<string, string> = { '초급': 'beginner', '중급': 'intermediate', '고급': 'advanced' };

  const filtered = learnContents.filter(c => {
    const matchLevel = activeLevel === '전체' || c.level === levelMap[activeLevel];
    const matchCat = activeCategory === '전체' || c.category === activeCategory;
    return matchLevel && matchCat;
  });

  return (
    <div className="p-3 md:p-6 max-w-[1200px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>투자 학습</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>전문가가 엄선한 투자 교육 콘텐츠</p>
      </div>

      {/* Featured */}
      <div className="card p-4 md:p-6 mb-4" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)', border: '1px solid var(--border-normal)' }}>
        <div className="flex gap-3 md:gap-5">
          <div className="text-3xl md:text-5xl shrink-0">🕯️</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="badge-amber">추천</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: levelColors.beginner.bg, color: levelColors.beginner.color, fontFamily: 'Noto Sans KR' }}>초급</span>
            </div>
            <h2 className="text-base md:text-xl font-black mb-1.5 leading-snug" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              캔들스틱 차트 완전 정복
            </h2>
            <p className="text-xs md:text-sm leading-relaxed mb-3 hidden sm:block" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
              양봉과 음봉의 의미부터 주요 패턴까지, 캔들스틱 차트를 처음 접하는 투자자를 위한 완전 가이드입니다.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} /><span style={{ fontFamily: 'Noto Sans KR' }}>5분</span>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Eye size={11} /><span style={{ fontFamily: 'JetBrains Mono' }}>12,840</span>
              </div>
              <button className="btn-amber text-xs px-3 py-1.5 ml-auto">읽기 시작</button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters — all scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
        {levels.map(l => (
          <button key={l} onClick={() => setActiveLevel(l)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all shrink-0"
            style={{
              background: activeLevel === l ? 'var(--amber)' : 'var(--bg-card)',
              color: activeLevel === l ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${activeLevel === l ? 'var(--amber)' : 'var(--border-subtle)'}`,
              fontFamily: 'Noto Sans KR',
              fontWeight: activeLevel === l ? 700 : 400,
            }}>
            {l}
          </button>
        ))}
        <div className="w-px shrink-0 mx-1" style={{ background: 'var(--border-subtle)' }} />
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className="px-3 py-1.5 rounded-full text-xs transition-all shrink-0"
            style={{
              color: activeCategory === c ? 'var(--amber)' : 'var(--text-muted)',
              background: activeCategory === c ? 'var(--amber-subtle)' : 'transparent',
              fontFamily: 'Noto Sans KR',
            }}>
            {c}
          </button>
        ))}
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {/* Grid: 1 col mobile, 2 col sm, 3 col lg */}
      {!loading && !error && (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(content => {
          const lvl = levelColors[content.level];
          return (
            <div key={content.id} className="card-interactive p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-2xl md:text-3xl">{content.emoji}</div>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: lvl.bg, color: lvl.color, fontFamily: 'Noto Sans KR' }}>
                  {lvl.label}
                </span>
              </div>
              <div className="badge-amber mb-1.5 inline-block" style={{ fontFamily: 'Noto Sans KR', fontSize: 10 }}>{content.category}</div>
              <h3 className="text-sm font-bold mb-1.5 leading-snug" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{content.title}</h3>
              <p className="text-xs leading-relaxed mb-3 hidden sm:block" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{content.description}</p>
              <div className="flex items-center gap-3 pt-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={10} /><span style={{ fontFamily: 'Noto Sans KR' }}>{content.duration}</span>
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Eye size={10} /><span style={{ fontFamily: 'JetBrains Mono' }}>{content.readCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="text-center py-12">
          <BookOpen size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>해당 조건의 콘텐츠가 없습니다</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
