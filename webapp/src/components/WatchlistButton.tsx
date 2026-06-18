'use client';
import { useState } from 'react';
import { Star } from 'lucide-react';
import { addWatchlist, removeWatchlist } from '@/apis';
import { useWatchlistStore } from '@/store/useStore';

interface Props {
  symbol: string;
  size?: 'sm' | 'md';
}

export default function WatchlistButton({ symbol, size = 'md' }: Props) {
  const { isWatching, add, remove } = useWatchlistStore();
  const watched = isWatching(symbol);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const next = !watched;
    // optimistic update
    next ? add(symbol) : remove(symbol);
    try {
      if (next) await addWatchlist(symbol);
      else await removeWatchlist(symbol);
    } catch {
      // revert on failure
      next ? remove(symbol) : add(symbol);
    } finally {
      setLoading(false);
    }
  };

  const dim = size === 'sm' ? 14 : 16;
  const cls = size === 'sm'
    ? 'w-7 h-7 rounded-lg'
    : 'w-8 h-8 rounded-lg';

  return (
    <button
      onClick={toggle}
      aria-pressed={watched}
      title={watched ? '관심종목 제거' : '관심종목 추가'}
      disabled={loading}
      className={`${cls} flex items-center justify-center shrink-0 transition-all active:scale-90`}
      style={{
        background: watched ? 'var(--amber-glow)' : 'var(--bg-card)',
        border: `1px solid ${watched ? 'rgba(245,166,35,0.3)' : 'var(--border-subtle)'}`,
        color: watched ? 'var(--amber)' : 'var(--text-secondary)',
        opacity: loading ? 0.5 : 1,
      }}
    >
      <Star size={dim} fill={watched ? 'var(--amber)' : 'none'} />
    </button>
  );
}
