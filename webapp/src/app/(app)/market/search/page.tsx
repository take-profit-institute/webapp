'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { searchStocks, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { formatMarketCap } from '@/lib/format';
import { marketDetailHref } from '@/lib/market-routes';
import type { StockMarket, StockSort } from '@/lib/api-types';

const MARKETS: Array<'전체' | StockMarket> = ['전체', 'KOSPI', 'KOSDAQ'];
const SORTS: Array<{ label: string; value: StockSort }> = [
  { label: '코드순', value: 'CODE_ASC' },
  { label: '이름순', value: 'NAME_ASC' },
  { label: '시총순', value: 'MARKET_CAP_DESC' },
];
const PAGE_SIZE = 20;

export default function StockSearchPage() {
  const [queryInput, setQueryInput] = useState('');
  const [q, setQ] = useState('');
  const [market, setMarket] = useState<'전체' | StockMarket>('전체');
  const [sort, setSort] = useState<StockSort>('CODE_ASC');
  const [page, setPage] = useState(0); // 0-based (서버와 동일)

  // 입력 디바운스 — 타이핑마다 요청하지 않는다.
  useEffect(() => {
    const t = setTimeout(() => setQ(queryInput.trim()), 300);
    return () => clearTimeout(t);
  }, [queryInput]);

  // 필터/검색/정렬 변경 시 첫 페이지로.
  useEffect(() => { setPage(0); }, [q, market, sort]);

  const { data, loading, error, refetch } = useApi(
    () => searchStocks({
      q: q || undefined,
      market: market === '전체' ? undefined : market,
      sort,
      page,
      size: PAGE_SIZE,
    }),
    [q, market, sort, page],
  );

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? 0;

  return (
    <div className="p-3 md:p-6 max-w-[1000px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>종목 검색</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
          전체 상장 종목 {totalElements.toLocaleString()}개 · 코드/이름 검색
        </p>
      </div>

      {/* 검색 + 필터 */}
      <div className="card p-3 md:p-4 mb-3">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-dark text-sm pl-12 py-2 w-full"
            placeholder="종목명 또는 코드 (예: 삼성전자, 005930)"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {MARKETS.map((m) => (
            <button key={m} onClick={() => setMarket(m)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: market === m ? 'var(--amber)' : 'var(--bg-surface)',
                color: market === m ? '#000' : 'var(--text-secondary)',
                border: `1px solid ${market === m ? 'var(--amber)' : 'var(--border-subtle)'}`,
              }}>
              {m}
            </button>
          ))}
          <div className="w-px h-4 mx-1 shrink-0" style={{ background: 'var(--border-subtle)' }} />
          {SORTS.map((s) => (
            <button key={s.value} onClick={() => setSort(s.value)}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{
                color: sort === s.value ? 'var(--amber)' : 'var(--text-muted)',
                background: sort === s.value ? 'var(--amber-subtle)' : 'transparent',
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="card p-8 text-center text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="card overflow-hidden">
              {items.map((s, i) => (
                <Link key={s.code} href={marketDetailHref(s.code)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--bg-surface)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                    {s.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.code}</span>
                      <span className="badge-amber" style={{ fontSize: 9, padding: '1px 5px' }}>{s.market}</span>
                      {s.sector && (
                        <span className="text-xs truncate" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{s.sector}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {s.marketCap > 0 && (
                      <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                        {formatMarketCap(s.marketCap, 'KRW')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 페이지네이션 (서버 총 페이지 기반) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs px-2" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
