'use client';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Bell, Search, TrendingUp, Wallet, BarChart2, Trophy } from 'lucide-react';
import MiniSparkline from '@/components/MiniSparkline';
import { stockList, myHoldings, recentTransactions, portfolioHistory, generateSparkline } from '@/lib/mock-data';

const statCards = [
  { label: '총 자산', value: '118,360,000', unit: '원', change: '+18.36%', positive: true, icon: Wallet },
  { label: '오늘 손익', value: '+285,600', unit: '원', change: '+0.24%', positive: true, icon: TrendingUp },
  { label: '총 수익률', value: '+18.36', unit: '%', change: '+2.1%p', positive: true, icon: BarChart2 },
  { label: '현재 랭킹', value: '#4', unit: '', change: '▲2 상승', positive: true, icon: Trophy },
];

export default function DashboardPage() {
  const topStocks = stockList.slice(0, 5);
  const portfolioHistoryData = portfolioHistory.map(d => d.value);
  const minVal = Math.min(...portfolioHistoryData);
  const maxVal = Math.max(...portfolioHistoryData);

  return (
    <div className="p-3 md:p-6 max-w-[1400px]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            대시보드
          </h1>
          <p className="text-xs md:text-sm mt-0.5 hidden sm:block" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
            2026년 6월 15일 · 시장 마감
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input className="input-dark text-sm pl-9 w-40 py-2" placeholder="종목 검색..." />
          </div>
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--amber)' }} />
          </button>
        </div>
      </div>

      {/* Stat cards — 2×2 on mobile, 4×1 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {statCards.map(({ label, value, unit, change, positive, icon: Icon }) => (
          <div key={label} className="card p-3 md:p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
                <Icon size={14} style={{ color: 'var(--amber)' }} />
              </div>
              <span className={`badge-${positive ? 'gain' : 'loss'} text-[10px] md:text-xs`}>{change}</span>
            </div>
            <p className="text-[10px] md:text-xs mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
            <p className="text-base md:text-xl font-black font-mono leading-tight" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
              {value}<span className="text-xs ml-0.5" style={{ color: 'var(--text-secondary)' }}>{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Portfolio chart + allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <div className="lg:col-span-2 card p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>포트폴리오 추이</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>최근 30일</p>
            </div>
            <span className="badge-gain">+18.36%</span>
          </div>
          <svg width="100%" height="120" viewBox="0 0 500 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5A623" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const range = maxVal - minVal || 1;
              const pts = portfolioHistoryData.map((v, i) => {
                const x = (i / (portfolioHistoryData.length - 1)) * 500;
                const y = 110 - ((v - minVal) / range) * 100;
                return `${x},${y}`;
              });
              return (
                <>
                  <polygon points={`0,110 ${pts.join(' ')} 500,110`} fill="url(#portfolioGrad)" />
                  <polyline points={pts.join(' ')} fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx={500} cy={110 - ((portfolioHistoryData[portfolioHistoryData.length - 1] - minVal) / range) * 100} r="4" fill="var(--amber)" />
                </>
              );
            })()}
          </svg>
          <div className="flex justify-between mt-1">
            {portfolioHistory.filter((_, i) => i % 6 === 0).map(d => (
              <span key={d.date} className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{d.date.slice(5)}</span>
            ))}
          </div>
        </div>

        {/* Asset allocation — desktop only full, mobile simplified */}
        <div className="card p-4 md:p-5">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>자산 구성</p>
          <div className="flex items-center gap-4 lg:flex-col lg:items-center">
            <svg width="90" height="90" viewBox="0 0 100 100" className="shrink-0">
              {(() => {
                const data = [
                  { pct: 38, color: '#F5A623' }, { pct: 19.5, color: '#0ECB81' },
                  { pct: 18.1, color: '#3B82F6' }, { pct: 11.7, color: '#8B5CF6' }, { pct: 12.7, color: '#3D5068' },
                ];
                let angle = -Math.PI / 2;
                return data.map((d, i) => {
                  const sweep = (d.pct / 100) * Math.PI * 2;
                  const [cx, cy, r, ir] = [50, 50, 42, 26];
                  const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
                  angle += sweep;
                  const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
                  const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
                  const ix2 = cx + ir * Math.cos(angle - sweep), iy2 = cy + ir * Math.sin(angle - sweep);
                  const lg = sweep > Math.PI ? 1 : 0;
                  return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2} L${ix1} ${iy1} A${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2}Z`} fill={d.color} opacity={0.85} />;
                });
              })()}
            </svg>
            <div className="flex-1 lg:w-full space-y-1.5 mt-0 lg:mt-3">
              {[
                { label: '반도체', pct: 38, color: '#F5A623' }, { label: 'IT', pct: 19.5, color: '#0ECB81' },
                { label: '배터리', pct: 18.1, color: '#3B82F6' }, { label: '기술', pct: 11.7, color: '#8B5CF6' },
                { label: '현금', pct: 12.7, color: '#3D5068' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{s.label}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row — stacked on mobile, 3-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Holdings */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>보유 종목</p>
            <Link href="/portfolio" className="text-xs" style={{ color: 'var(--amber)' }}>전체 보기</Link>
          </div>
          <div className="space-y-3">
            {myHoldings.slice(0, 4).map(h => (
              <div key={h.symbol} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{h.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{h.quantity}주</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{(h.totalValue / 10000).toFixed(0)}만</p>
                  <p className="text-xs font-mono" style={{ color: h.profitLoss >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {h.profitLoss >= 0 ? '+' : ''}{h.profitLossPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market movers */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>시장 동향</p>
            <Link href="/market" className="text-xs" style={{ color: 'var(--amber)' }}>전체 보기</Link>
          </div>
          <div className="space-y-2">
            {topStocks.map(s => (
              <Link key={s.symbol} href={`/market/${s.symbol}`}
                className="flex items-center justify-between py-1 rounded-lg px-1.5 transition-colors"
                style={{ color: 'inherit' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{s.name}</span>
                <div className="flex items-center gap-2">
                  <MiniSparkline data={generateSparkline(s.price, 12, s.price)} width={40} height={20} positive={s.change >= 0} />
                  <span className="text-xs font-mono w-14 text-right" style={{ color: s.change >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                    {s.change >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>최근 거래</p>
            <Link href="/portfolio" className="text-xs" style={{ color: 'var(--amber)' }}>전체 보기</Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: t.type === 'buy' ? 'var(--gain-dim)' : 'var(--loss-dim)', color: t.type === 'buy' ? 'var(--gain)' : 'var(--loss)' }}>
                    {t.type === 'buy' ? '수' : '도'}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{t.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.date} · {t.quantity}주</p>
                  </div>
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                  {(t.total / 10000).toFixed(0)}만
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
