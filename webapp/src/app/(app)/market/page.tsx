'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import MiniSparkline from '@/components/MiniSparkline';
import { getSparklines, searchStocks, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { generateSparkline, symbolSeed } from '@/lib/chart-utils';
import { formatMarketCap } from '@/lib/format';
import { marketDetailHref } from '@/lib/market-routes';
import type { StockMarket, StockSort } from '@/lib/api-types';

const exchanges: Array<'전체' | StockMarket> = ['전체', 'KOSPI', 'KOSDAQ'];
const sectors = ['전체', '반도체', 'IT', '배터리', '자동차', '바이오'];
const sorts: Array<{ label: string; value: StockSort }> = [
  { label: '코드순', value: 'CODE_ASC' },
  { label: '이름순', value: 'NAME_ASC' },
  { label: '시총순', value: 'MARKET_CAP_DESC' },
];

const PAGE_SIZE = 20;
const PAGE_WINDOW_SIZE = 5;

export default function MarketPage() {
  const [activeExchange, setActiveExchange] = useState<'전체' | StockMarket>('전체');
  const [activeSector, setActiveSector] = useState('전체');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<StockSort>('CODE_ASC');
  const [page, setPage] = useState(0);

  const { data, loading, error, refetch } = useApi(
    () => searchStocks({
      q: query.trim() || undefined,
      market: activeExchange === '전체' ? undefined : activeExchange,
      sector: activeSector === '전체' ? undefined : activeSector,
      sort,
      page,
      size: PAGE_SIZE,
    }),
    [query, activeExchange, activeSector, sort, page],
  );
  const { data: sparklines } = useApi(() => getSparklines(14), []);

  const stockList = data?.items ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;
  const sparklinesMap = sparklines ?? {};
  const activeSortLabel = sorts.find((s) => s.value === sort)?.label ?? '정렬';

  const pageWindowStart = Math.floor(currentPage / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE;
  const pageWindowEnd = Math.min(totalPages - 1, pageWindowStart + PAGE_WINDOW_SIZE - 1);
  const visiblePages = Array.from(
    { length: Math.max(0, pageWindowEnd - pageWindowStart + 1) },
    (_, i) => pageWindowStart + i,
  );
  const canMovePrevWindow = pageWindowStart > 0;
  const canMoveNextWindow = pageWindowEnd < totalPages - 1;
  const itemStart = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const itemEnd = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);

  function getStockSparkData(symbol: string, fallbackPrice: number) {
    const closes = sparklinesMap[symbol] ?? [];
    const spark = closes.length >= 2 ? closes : generateSparkline(fallbackPrice || 1, 12, symbolSeed(symbol));
    const firstClose = closes[0] ?? fallbackPrice;
    const lastClose = closes[closes.length - 1] ?? fallbackPrice;
    const isUp = lastClose >= firstClose;
    return { spark, isUp };
  }

  function cycleSort() {
    const idx = sorts.findIndex((s) => s.value === sort);
    setSort(sorts[(idx + 1) % sorts.length].value);
    setPage(0);
  }

  return (
    <div className="p-3 md:p-6 max-w-[1200px]">
      <div className="mb-4 md:mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>시장</h1>
          <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
            전체 상장 종목 {totalElements.toLocaleString()}개
          </p>
        </div>
        <Link href="/market/search"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium shrink-0"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <Search size={13} />
          <span>전체 종목 검색</span>
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {[
          { label: 'KOSPI', value: '2,847.34', change: '+12.5', pct: '+0.44%', up: true },
          { label: 'KOSDAQ', value: '847.12', change: '-3.2', pct: '-0.38%', up: false },
        ].map(idx => (
          <div key={idx.label} className="card p-3 md:p-4 flex items-center justify-between shrink-0 w-44 md:w-auto md:flex-1">
            <div>
              <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>{idx.label}</p>
              <p className="text-lg md:text-xl font-black font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{idx.value}</p>
            </div>
            <div className="text-right">
              <span className={`badge-${idx.up ? 'gain' : 'loss'} text-xs`}>{idx.pct}</span>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{idx.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-3 md:p-4 mb-3">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input-dark text-sm pl-8 py-2 w-full"
              placeholder="종목 검색"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs shrink-0"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: sort !== 'CODE_ASC' ? 'var(--amber)' : 'var(--text-secondary)' }}
            onClick={cycleSort}
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">{activeSortLabel}</span>
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {exchanges.map(e => (
            <button key={e} onClick={() => {
              setActiveExchange(e);
              setPage(0);
            }}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0"
              style={{
                background: activeExchange === e ? 'var(--amber)' : 'var(--bg-surface)',
                color: activeExchange === e ? '#000' : 'var(--text-secondary)',
                border: `1px solid ${activeExchange === e ? 'var(--amber)' : 'var(--border-subtle)'}`,
              }}>
              {e}
            </button>
          ))}
          <div className="w-px shrink-0" style={{ background: 'var(--border-subtle)' }} />
          {sectors.map(s => (
            <button key={s} onClick={() => {
              setActiveSector(s);
              setPage(0);
            }}
              className="px-3 py-1 rounded-full text-xs transition-all shrink-0"
              style={{
                color: activeSector === s ? 'var(--amber)' : 'var(--text-muted)',
                background: activeSector === s ? 'var(--amber-subtle)' : 'transparent',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          <div className="lg:hidden space-y-2">
            {stockList.map(s => {
              const { spark, isUp } = getStockSparkData(s.code, s.marketCap);
              return (
                <Link key={s.code} href={marketDetailHref(s.code)}
                  className="card-interactive flex items-center px-4 py-3 gap-3"
                  style={{ textDecoration: 'none', display: 'flex' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--bg-surface)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                    {s.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.code}</span>
                      <span className="badge-amber" style={{ fontSize: 9, padding: '1px 4px' }}>{s.market}</span>
                    </div>
                  </div>
                  <MiniSparkline data={spark} width={44} height={22} positive={isUp} />
                  <div className="text-right shrink-0 w-24">
                    <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                      {formatMarketCap(s.marketCap, 'KRW')}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{s.sector}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:block card overflow-hidden">
            <div className="grid text-xs px-4 py-3" style={{
              gridTemplateColumns: '2fr 1fr 1fr 90px',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-subtle)',
              fontFamily: 'Noto Sans KR',
            }}>
              <span>종목</span>
              <span className="text-right">시장</span>
              <span className="text-right">시가총액</span>
              <span className="text-right">2주 추이</span>
            </div>
            {stockList.map((s, i) => {
              const { spark, isUp } = getStockSparkData(s.code, s.marketCap);
              return (
                <Link key={s.code} href={marketDetailHref(s.code)}
                  className="grid px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 90px', borderBottom: i < stockList.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--bg-surface)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                      {s.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{s.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.code}</span>
                        <span className="badge-amber" style={{ fontSize: 10, padding: '1px 5px' }}>{s.sector}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.market}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{formatMarketCap(s.marketCap, 'KRW')}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <MiniSparkline data={spark} width={64} height={28} positive={isUp} />
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
              <button
                onClick={() => setPage(Math.max(0, pageWindowStart - PAGE_WINDOW_SIZE))}
                disabled={!canMovePrevWindow}
                aria-label="이전 페이지 묶음"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                aria-label="이전 페이지"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={14} />
              </button>

              {visiblePages.map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: currentPage === p ? 'var(--amber)' : 'var(--bg-card)',
                    color: currentPage === p ? '#000' : 'var(--text-secondary)',
                    border: `1px solid ${currentPage === p ? 'var(--amber)' : 'var(--border-subtle)'}`,
                    fontFamily: 'JetBrains Mono',
                  }}>
                  {p + 1}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                aria-label="다음 페이지"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <ChevronRight size={14} />
              </button>

              <button
                onClick={() => setPage(Math.min(totalPages - 1, pageWindowStart + PAGE_WINDOW_SIZE))}
                disabled={!canMoveNextWindow}
                aria-label="다음 페이지 묶음"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <ChevronsRight size={14} />
              </button>

              <span className="basis-full sm:basis-auto text-center text-xs sm:ml-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                {itemStart}-{itemEnd} / {totalElements}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
