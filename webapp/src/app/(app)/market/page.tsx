'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import MarketIndexWidget from '@/components/MarketIndexWidget';
import MarketRankingSection from '@/components/MarketRankingSection';
import MiniSparkline from '@/components/MiniSparkline';
import { getLiveMarketStocks, getSparklines, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { generateSparkline, symbolSeed } from '@/lib/chart-utils';
import { formatMarketCap } from '@/lib/format';
import { marketDetailHref } from '@/lib/market-routes';
import type { StockMarket } from '@/lib/api-types';

const exchanges: Array<'전체' | StockMarket> = ['전체', 'KOSPI', 'KOSDAQ'];
const PAGE_SIZE = 20;
const PAGE_WINDOW_SIZE = 5;

export default function MarketPage() {
  const [activeExchange, setActiveExchange] = useState<'전체' | StockMarket>('전체');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const { data, loading, error, refetch } = useApi(
    () => getLiveMarketStocks({
      market: activeExchange === '전체' ? undefined : activeExchange,
      page,
      size: PAGE_SIZE,
    }),
    [activeExchange, page],
  );

  // 2주 종가 스파크라인. 종목코드 → 종가 배열. 한 번만 조회하고, 없는 종목은 시드 기반으로 생성.
  const { data: sparklines } = useApi(() => getSparklines(14), []);
  const sparklinesMap = sparklines ?? {};
  function getStockSpark(symbol: string, fallbackPrice: number): number[] {
    const closes = sparklinesMap[symbol] ?? [];
    return closes.length >= 2 ? closes : generateSparkline(fallbackPrice || 1, 12, symbolSeed(symbol));
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  const stockList = (data?.items ?? []).filter((stock) =>
    !normalizedQuery || stock.name.toLocaleLowerCase('ko-KR').includes(normalizedQuery) || stock.code.includes(normalizedQuery),
  );
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;

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

      <MarketIndexWidget />

      <MarketRankingSection />

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
          <div className="flex items-center px-3 text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>시가총액순</div>
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
        </div>
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          <div className="lg:hidden space-y-2">
            {stockList.map(s => {
              const isUp = s.changePercent >= 0;
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
                  <MiniSparkline data={getStockSpark(s.code, s.price)} width={44} height={22} positive={isUp} />
                  <div className="text-right shrink-0 w-24">
                    <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                      {s.price.toLocaleString('ko-KR')}원
                    </p>
                    <p className={`text-xs ${isUp ? 'text-gain' : 'text-loss'}`}>
                      {s.changePercent > 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:block card overflow-hidden">
            <div className="grid text-xs px-4 py-3" style={{
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 90px',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-subtle)',
              fontFamily: 'Noto Sans KR',
            }}>
              <span>종목</span>
              <span className="text-right">현재가</span>
              <span className="text-right">전일 대비</span>
              <span className="text-right">시가총액</span>
              <span className="text-right">거래량</span>
              <span className="text-right">2주 추이</span>
            </div>
            {stockList.map((s, i) => {
              const isUp = s.changePercent >= 0;
              return (
                <Link key={s.code} href={marketDetailHref(s.code)}
                  className="grid px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 90px', borderBottom: i < stockList.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none' }}
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
                        <span className="badge-amber" style={{ fontSize: 10, padding: '1px 5px' }}>{s.market}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.price.toLocaleString('ko-KR')}원</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <div className="text-right font-mono text-xs" style={{ color: isUp ? 'var(--gain)' : 'var(--loss)' }}>
                      <p>{s.change > 0 ? '+' : ''}{s.change.toLocaleString('ko-KR')}원</p>
                      <p>{s.changePercent > 0 ? '+' : ''}{s.changePercent.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{formatMarketCap(s.marketCap, 'KRW')}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{s.volume.toLocaleString('ko-KR')}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <MiniSparkline data={getStockSpark(s.code, s.price)} width={64} height={28} positive={isUp} />
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
