'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getTrendingRankings, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { marketDetailHref } from '@/lib/market-routes';
import type { RankingType } from '@/lib/api-types';

/**
 * 마켓 랜딩 "지금 뜨는 종목" — market-service 트렌딩 랭킹 6종 탭.
 *
 * 랭킹 identity 의 소유자는 market-service proto 의 RankingType enum(단일 진실)이다. 여기서는
 * 그 enum 값에 한글 라벨/순서만 입힌다(표현 정책 = 프론트 상수). 데이터는 BFF
 * `/api/market/rankings?type=` 를 거쳐 Redis 캐시에서만 읽으므로 빠르고 일관적이다.
 */
const TABS: ReadonlyArray<{ type: RankingType; label: string }> = [
  { type: 'RISING', label: '급상승' },
  { type: 'FALLING', label: '급하락' },
  { type: 'VOLUME_SPIKE', label: '거래량' },
  { type: 'POPULAR', label: '인기' },
  { type: 'RATE_UP', label: '등락률 상위' },
  { type: 'RATE_DOWN', label: '등락률 하위' },
];

const DEFAULT_TYPE: RankingType = 'RISING';
const TOP_N = 20;

function formatAsOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MarketRankingSection() {
  const [activeType, setActiveType] = useState<RankingType>(DEFAULT_TYPE);
  const { data, loading, error, refetch } = useApi(
    () => getTrendingRankings(activeType, TOP_N),
    [activeType],
  );

  const items = data?.items ?? [];
  const asOf = data?.asOf ? formatAsOf(data.asOf) : '';

  return (
    <div className="card p-3 md:p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
          지금 뜨는 종목
        </h2>
        {asOf && (
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            {asOf} 기준
          </span>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0"
            style={{
              background: activeType === type ? 'var(--amber)' : 'var(--bg-surface)',
              color: activeType === type ? '#000' : 'var(--text-secondary)',
              border: `1px solid ${activeType === type ? 'var(--amber)' : 'var(--border-subtle)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && items.length === 0 && (
        <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          랭킹 데이터를 준비 중입니다.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-1">
          {items.map((it) => {
            const isUp = it.changePercent >= 0;
            return (
              <Link
                key={it.symbol}
                href={marketDetailHref(it.symbol)}
                className="grid items-center px-1 py-2 transition-colors hover:bg-[var(--bg-elevated)] rounded-lg"
                style={{ gridTemplateColumns: '28px 1fr auto', textDecoration: 'none', gap: 8 }}
              >
                <span className="text-xs font-bold text-center" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                  {it.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
                    {it.name}
                  </p>
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {it.symbol}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                    {it.price.toLocaleString('ko-KR')}원
                  </p>
                  <p className={`text-xs ${isUp ? 'text-gain' : 'text-loss'}`}>
                    {it.changePercent > 0 ? '+' : ''}{it.changePercent.toFixed(2)}%
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
