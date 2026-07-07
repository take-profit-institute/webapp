'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock, Eye, Search, Star } from 'lucide-react';
import {
  getLearnContents,
  getLearnProgress,
  getRecommendedLearnContents,
  toggleLearnFavorite,
  useApi,
} from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { learnDetailHref } from '@/lib/market-routes';
import type { LearnContent, LearnLevel } from '@/lib/api-types';

const levels = ['전체', '초급', '중급', '고급'];
const levelMap: Record<string, LearnLevel> = { '초급': 'beginner', '중급': 'intermediate', '고급': 'advanced' };
const levelColors: Record<LearnLevel, { bg: string; color: string; label: string }> = {
  beginner: { bg: 'rgba(14,203,129,0.1)', color: 'var(--gain)', label: '초급' },
  intermediate: { bg: 'rgba(245,166,35,0.1)', color: 'var(--amber)', label: '중급' },
  advanced: { bg: 'rgba(246,70,93,0.1)', color: 'var(--loss)', label: '고급' },
};

function LearnCard({ content, onFavorite }: { content: LearnContent; onFavorite: (id: string) => void }) {
  const lvl = levelColors[content.level];
  return (
    <Link href={learnDetailHref(content.id)} className="card-interactive p-4 block" style={{ textDecoration: 'none' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-2xl md:text-3xl">{content.emoji}</div>
        <button onClick={(e) => { e.preventDefault(); onFavorite(content.id); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          title={content.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          style={{ background: content.favorite ? 'var(--amber-subtle)' : 'var(--bg-surface)', color: content.favorite ? 'var(--amber)' : 'var(--text-muted)' }}>
          <Star size={14} fill={content.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="badge-amber" style={{ fontFamily: 'Noto Sans KR', fontSize: 10 }}>{content.category}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: lvl.bg, color: lvl.color, fontFamily: 'Noto Sans KR' }}>{lvl.label}</span>
        {content.completed && <CheckCircle2 size={13} style={{ color: 'var(--gain)' }} />}
      </div>
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
    </Link>
  );
}

export default function LearnPage() {
  const [activeLevel, setActiveLevel] = useState('전체');
  const [activeCategory, setActiveCategory] = useState('전체');
  const [query, setQuery] = useState('');

  const { data, loading, error, refetch } = useApi(() => getLearnContents(), []);
  const { data: progress, refetch: refetchProgress } = useApi(() => getLearnProgress(), []);
  const { data: recommended, refetch: refetchRecommended } = useApi(() => getRecommendedLearnContents(), []);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  const learnContents = useMemo(
    () => (data ?? []).map((content) => ({
      ...content,
      favorite: favoriteOverrides[content.id] ?? content.favorite,
    })),
    [data, favoriteOverrides],
  );
  const categories = ['전체', ...Array.from(new Set(learnContents.map((c) => c.category)))];

  const filtered = learnContents.filter(c => {
    const matchLevel = activeLevel === '전체' || c.level === levelMap[activeLevel];
    const matchCat = activeCategory === '전체' || c.category === activeCategory;
    const q = query.trim().toLowerCase();
    const matchQuery = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q));
    return matchLevel && matchCat && matchQuery;
  });

  const handleFavorite = async (id: string) => {
    setFavoriteOverrides((prev) => ({ ...prev, [id]: !(prev[id] ?? learnContents.find((c) => c.id === id)?.favorite) }));
    try {
      const result = await toggleLearnFavorite(id);
      setFavoriteOverrides((prev) => ({ ...prev, [id]: result.favorite }));
      refetchRecommended();
    } catch {
      setFavoriteOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-[1200px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>투자 학습</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>콘텐츠를 읽고 학습 완료 상태를 관리하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="card p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>내 학습 진도</p>
            <span className="text-xs font-mono" style={{ color: 'var(--amber)' }}>{progress?.percent ?? 0}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg-surface)' }}>
            <div className="h-full" style={{ width: `${progress?.percent ?? 0}%`, background: 'var(--amber)' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(progress?.byCategory ?? []).map((item) => (
              <div key={item.category} className="p-2 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{item.category}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{item.completed}/{item.total} · {item.percent}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>추천 콘텐츠</p>
          <div className="space-y-2">
            {(recommended ?? []).slice(0, 3).map((content) => (
              <Link key={content.id} href={learnDetailHref(content.id)} className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                <span className="text-lg">{content.emoji}</span>
                <span className="text-xs truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{content.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-3 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            className="input-dark text-sm" placeholder="제목 또는 키워드 검색" style={{ fontFamily: 'Noto Sans KR' }} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(content => <LearnCard key={content.id} content={content} onFavorite={handleFavorite} />)}
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
