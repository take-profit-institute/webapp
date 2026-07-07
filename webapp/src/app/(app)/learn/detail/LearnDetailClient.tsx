'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, Eye, Star } from 'lucide-react';
import {
  completeLearn,
  getLearnContent,
  getRecommendedLearnContents,
  toggleLearnFavorite,
  useApi,
} from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import type { LearnLevel } from '@/lib/api-types';

const levelMeta: Record<LearnLevel, { bg: string; color: string; label: string }> = {
  beginner: { bg: 'rgba(14,203,129,0.1)', color: 'var(--gain)', label: '초급' },
  intermediate: { bg: 'rgba(245,166,35,0.1)', color: 'var(--amber)', label: '중급' },
  advanced: { bg: 'rgba(246,70,93,0.1)', color: 'var(--loss)', label: '고급' },
};

export default function LearnDetailClient({ id }: { id: string }) {
  const { data: content, loading, error, refetch } = useApi(() => getLearnContent(id), [id]);
  const { data: recommended } = useApi(() => getRecommendedLearnContents(), []);
  const [completedOverride, setCompletedOverride] = useState<boolean | null>(null);
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [mutating, setMutating] = useState(false);

  if (loading) {
    return (
      <div className="p-3 md:p-6 max-w-[960px]">
        <Loader />
      </div>
    );
  }
  if (error || !content) {
    return (
      <div className="p-3 md:p-6 max-w-[960px]">
        <ErrorState error={error ?? new Error('콘텐츠를 불러올 수 없습니다')} onRetry={refetch} />
      </div>
    );
  }

  const completed = completedOverride ?? content.completed;
  const favorite = favoriteOverride ?? content.favorite;
  const lvl = levelMeta[content.level];

  const handleComplete = async () => {
    setMutating(true);
    setMessage(null);
    try {
      await completeLearn(content.id);
      setCompletedOverride(true);
      setMessage({ ok: true, text: '학습 완료로 저장했습니다' });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '학습 완료 처리에 실패했습니다' });
    } finally {
      setMutating(false);
    }
  };

  const handleFavorite = async () => {
    setFavoriteOverride(!favorite);
    try {
      const result = await toggleLearnFavorite(content.id);
      setFavoriteOverride(result.favorite);
    } catch {
      setFavoriteOverride(favorite);
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-[960px]">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/learn" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={15} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-black leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{content.title}</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{content.description}</p>
        </div>
      </div>

      <div className="card p-4 md:p-6 mb-3">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-4xl">{content.emoji}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="badge-amber" style={{ fontFamily: 'Noto Sans KR' }}>{content.category}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: lvl.bg, color: lvl.color, fontFamily: 'Noto Sans KR' }}>{lvl.label}</span>
                {completed && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--gain-dim)', color: 'var(--gain)', fontFamily: 'Noto Sans KR' }}>완료</span>}
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><Clock size={11} />{content.duration}</span>
                <span className="flex items-center gap-1"><Eye size={11} />{content.readCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button onClick={handleFavorite} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            title={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
            style={{ background: favorite ? 'var(--amber-subtle)' : 'var(--bg-surface)', color: favorite ? 'var(--amber)' : 'var(--text-muted)' }}>
            <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {content.keywords.map((keyword) => (
            <span key={keyword} className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
              #{keyword}
            </span>
          ))}
        </div>

        <article className="space-y-4 text-sm leading-7" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
          {content.body.split('\n\n').map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>

        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleComplete} disabled={completed || mutating}
            className="btn-amber w-full text-sm flex items-center justify-center gap-1.5"
            style={{ opacity: completed || mutating ? 0.55 : 1 }}>
            <CheckCircle2 size={15} />
            {completed ? '학습 완료됨' : mutating ? '저장 중...' : '학습 완료'}
          </button>
          {message && (
            <p className="text-xs text-center mt-2" style={{ color: message.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>다음에 읽기 좋은 콘텐츠</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(recommended ?? []).filter((item) => item.id !== content.id).slice(0, 4).map((item) => (
            <Link key={item.id} href={`/learn/${item.id}`} className="p-3 rounded-lg flex items-center gap-2"
              style={{ background: 'var(--bg-surface)', textDecoration: 'none' }}>
              <span className="text-xl">{item.emoji}</span>
              <span className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
