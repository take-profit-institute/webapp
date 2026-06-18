'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, ArrowDownRight, SlidersHorizontal } from 'lucide-react';
import MiniSparkline from '@/components/MiniSparkline';
import { getStocks, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { formatVolume } from '@/lib/format';
import { generateSparkline, symbolSeed } from '@/lib/chart-utils';

const exchanges = ['전체', 'KOSPI', 'KOSDAQ'];
const sectors = ['전체', '반도체', 'IT', '배터리', '자동차', '바이오'];

export default function MarketPage() {
  const [activeExchange, setActiveExchange] = useState('전체');
  const [activeSector, setActiveSector] = useState('전체');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'none' | 'gain' | 'loss'>('none');

  const { data, loading, error, refetch } = useApi(() => getStocks(), []);
  const stockList = data ?? [];

  let filtered = stockList.filter(s => {
    const matchExchange = activeExchange === '전체' || s.exchange === activeExchange;
    const matchSector = activeSector === '전체' || s.sector === activeSector;
    const matchQuery = !query || s.name.includes(query) || s.symbol.toLowerCase().includes(query.toLowerCase());
    return matchExchange && matchSector && matchQuery;
  });
  if (sortBy === 'gain') filtered = [...filtered].sort((a, b) => b.changePercent - a.changePercent);
  if (sortBy === 'loss') filtered = [...filtered].sort((a, b) => a.changePercent - b.changePercent);

  return (
    <div className="p-3 md:p-6 max-w-[1200px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>시장</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>실시간 주가 현황</p>
      </div>

      {/* Index cards — scrollable on mobile */}
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

      {/* Filters */}
      <div className="card p-3 md:p-4 mb-3">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input className="input-dark text-sm pl-8 py-2 w-full" placeholder="종목 검색" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs shrink-0"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: sortBy !== 'none' ? 'var(--amber)' : 'var(--text-secondary)' }}
            onClick={() => setSortBy(sortBy === 'gain' ? 'loss' : sortBy === 'loss' ? 'none' : 'gain')}
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">{sortBy === 'gain' ? '상승순' : sortBy === 'loss' ? '하락순' : '정렬'}</span>
          </button>
        </div>
        {/* Exchange filter — scroll on mobile */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {exchanges.map(e => (
            <button key={e} onClick={() => setActiveExchange(e)}
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
            <button key={s} onClick={() => setActiveSector(s)}
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

      {/* Mobile: card list | Desktop: table */}
      {!loading && !error && (
      <>
        {/* Mobile card list */}
        <div className="lg:hidden space-y-2">
          {filtered.map(s => {
            const spark = generateSparkline(s.price, 12, symbolSeed(s.symbol));
            return (
              <Link key={s.symbol} href={`/market/${s.symbol}`}
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
                    <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.symbol}</span>
                    <span className="badge-amber" style={{ fontSize: 9, padding: '1px 4px' }}>{s.exchange}</span>
                  </div>
                </div>
                <MiniSparkline data={spark} width={44} height={22} positive={s.change >= 0} />
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                    {s.price >= 100000 ? `${(s.price / 10000).toFixed(1)}만` : s.price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end gap-0.5">
                    {s.change >= 0 ? <ArrowUpRight size={11} style={{ color: 'var(--gain)' }} /> : <ArrowDownRight size={11} style={{ color: 'var(--loss)' }} />}
                    <span className="text-xs font-mono font-bold" style={{ color: s.change >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {Math.abs(s.changePercent).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block card overflow-hidden">
          <div className="grid text-xs px-4 py-3" style={{
            gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 100px',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)',
            fontFamily: 'Noto Sans KR',
          }}>
            <span>종목</span>
            <span className="text-right">현재가</span>
            <span className="text-right">등락</span>
            <span className="text-right">거래량</span>
            <span className="text-right">차트</span>
            <span className="text-right">거래</span>
          </div>
          {filtered.map((s, i) => {
            const spark = generateSparkline(s.price, 15, symbolSeed(s.symbol));
            return (
              <Link key={s.symbol} href={`/market/${s.symbol}`}
                className="grid px-4 py-3 transition-colors"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 100px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--bg-surface)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                    {s.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{s.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.symbol}</span>
                      <span className="badge-amber" style={{ fontSize: 10, padding: '1px 5px' }}>{s.exchange}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{s.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-end">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-0.5">
                      {s.change >= 0 ? <ArrowUpRight size={12} style={{ color: 'var(--gain)' }} /> : <ArrowDownRight size={12} style={{ color: 'var(--loss)' }} />}
                      <span className="text-sm font-mono font-bold" style={{ color: s.change >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                        {Math.abs(s.changePercent).toFixed(2)}%
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: s.change >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono', opacity: 0.7 }}>
                      {s.change >= 0 ? '+' : ''}{s.change.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{formatVolume(s.volume)}</span>
                </div>
                <div className="flex items-center justify-end">
                  <MiniSparkline data={spark} width={64} height={28} positive={s.change >= 0} />
                </div>
                <div className="flex items-center justify-end gap-2" onClick={e => e.preventDefault()}>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--gain-dim)', color: 'var(--gain)', border: '1px solid rgba(14,203,129,0.2)' }}>매수</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--loss-dim)', color: 'var(--loss)', border: '1px solid rgba(246,70,93,0.2)' }}>매도</button>
                </div>
              </Link>
            );
          })}
        </div>
      </>
      )}
    </div>
  );
}
