'use client';
import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { myHoldings, recentTransactions, portfolioHistory, sectorAllocation } from '@/lib/mock-data';

const tabs = ['보유 종목', '거래 내역', '수익 분석'];

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('보유 종목');

  const totalValue = myHoldings.reduce((s, h) => s + h.totalValue, 0);
  const totalPL = myHoldings.reduce((s, h) => s + h.profitLoss, 0);
  const totalPLPct = (totalPL / (totalValue - totalPL)) * 100;
  const histMin = Math.min(...portfolioHistory.map(d => d.value));
  const histMax = Math.max(...portfolioHistory.map(d => d.value));

  return (
    <div className="p-3 md:p-6 max-w-[1200px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>포트폴리오</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>내 투자 현황</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Portfolio chart */}
        <div className="md:col-span-2 card p-4 md:p-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[10px] md:text-xs mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>총 평가 자산</p>
              <p className="text-2xl md:text-3xl font-black font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
                {(totalValue + 2125780).toLocaleString()}<span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>원</span>
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ArrowUpRight size={13} style={{ color: 'var(--gain)' }} />
                <span className="text-xs md:text-sm font-mono font-bold" style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono' }}>
                  +{totalPL.toLocaleString()}원 (+{totalPLPct.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>가용 현금</p>
              <p className="text-lg font-mono font-bold" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>2,125,780원</p>
            </div>
          </div>
          <svg width="100%" height="90" viewBox="0 0 500 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5A623" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const vals = portfolioHistory.map(d => d.value);
              const r = histMax - histMin || 1;
              const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 500},${85 - ((v - histMin) / r) * 75}`);
              return (
                <>
                  <polygon points={`0,85 ${pts.join(' ')} 500,85`} fill="url(#portGrad)" />
                  <polyline points={pts.join(' ')} fill="none" stroke="var(--amber)" strokeWidth="2" />
                </>
              );
            })()}
          </svg>
        </div>

        {/* Sector allocation */}
        <div className="card p-4 md:p-5">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>섹터 배분</p>
          <div className="flex items-center gap-4 md:flex-col md:items-center">
            <svg width="80" height="80" viewBox="0 0 100 100" className="shrink-0">
              {(() => {
                let angle = -Math.PI / 2;
                return sectorAllocation.map((s, i) => {
                  const sweep = (s.percent / 100) * Math.PI * 2;
                  const [cx, cy, r, ir] = [50, 50, 42, 26];
                  const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
                  angle += sweep;
                  const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
                  const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
                  const ix2 = cx + ir * Math.cos(angle - sweep), iy2 = cy + ir * Math.sin(angle - sweep);
                  const lg = sweep > Math.PI ? 1 : 0;
                  return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2} L${ix1} ${iy1} A${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2}Z`} fill={s.color} opacity={0.85} />;
                });
              })()}
            </svg>
            <div className="flex-1 md:w-full space-y-1.5">
              {sectorAllocation.map(s => (
                <div key={s.sector} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{s.sector}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{s.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-none" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="px-4 md:px-5 py-3 text-sm font-medium transition-all shrink-0"
              style={{
                color: activeTab === t ? 'var(--amber)' : 'var(--text-secondary)',
                borderBottom: activeTab === t ? '2px solid var(--amber)' : '2px solid transparent',
                fontFamily: 'Noto Sans KR',
              }}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === '보유 종목' && (
          <div>
            {/* Desktop table header */}
            <div className="hidden md:grid px-5 py-3 text-xs" style={{
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
              color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'Noto Sans KR',
            }}>
              <span>종목</span><span className="text-right">평균단가</span><span className="text-right">현재가</span>
              <span className="text-right">수량</span><span className="text-right">평가금액</span><span className="text-right">손익</span>
            </div>
            {myHoldings.map((h, i) => (
              <div key={h.symbol}>
                {/* Mobile card */}
                <div className="md:hidden flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{ borderBottom: i < myHoldings.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--bg-surface)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                    {h.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{h.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{h.quantity}주 · 평균 {h.avgPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                      {(h.totalValue / 10000).toFixed(0)}만원
                    </p>
                    <div className="flex items-center justify-end gap-0.5">
                      {h.profitLoss >= 0 ? <ArrowUpRight size={11} style={{ color: 'var(--gain)' }} /> : <ArrowDownRight size={11} style={{ color: 'var(--loss)' }} />}
                      <span className="text-xs font-mono font-bold" style={{ color: h.profitLoss >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                        {h.profitLossPercent >= 0 ? '+' : ''}{h.profitLossPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                {/* Desktop row */}
                <div className="hidden md:grid px-5 py-4 transition-colors"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderBottom: i < myHoldings.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--bg-surface)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                      {h.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{h.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{h.symbol}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{h.avgPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{h.currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{h.quantity}주</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{h.totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col items-end justify-center">
                    <div className="flex items-center gap-0.5">
                      {h.profitLoss >= 0 ? <ArrowUpRight size={12} style={{ color: 'var(--gain)' }} /> : <ArrowDownRight size={12} style={{ color: 'var(--loss)' }} />}
                      <span className="text-sm font-mono font-bold" style={{ color: h.profitLoss >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                        {h.profitLossPercent >= 0 ? '+' : ''}{h.profitLossPercent.toFixed(2)}%
                      </span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: h.profitLoss >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono', opacity: 0.7 }}>
                      {h.profitLoss >= 0 ? '+' : ''}{h.profitLoss.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === '거래 내역' && (
          <div>
            {recentTransactions.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: i < recentTransactions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: t.type === 'buy' ? 'var(--gain-dim)' : 'var(--loss-dim)', color: t.type === 'buy' ? 'var(--gain)' : 'var(--loss)' }}>
                  {t.type === 'buy' ? '매수' : '매도'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{t.date} {t.time} · {t.quantity}주 @ {t.price.toLocaleString()}원</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{(t.total / 10000).toFixed(0)}만원</p>
                  <p className="text-xs" style={{ color: t.type === 'buy' ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
                    {t.type === 'buy' ? '▲ 매수' : '▼ 매도'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === '수익 분석' && (
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: '총 수익금', value: `+${(totalPL / 10000).toFixed(0)}만원`, color: 'var(--gain)' },
                { label: '수익률', value: `+${totalPLPct.toFixed(2)}%`, color: 'var(--gain)' },
                { label: '거래 횟수', value: '24회', color: 'var(--text-primary)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] md:text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
                  <p className="text-sm md:text-lg font-black font-mono" style={{ color, fontFamily: 'JetBrains Mono' }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>종목별 수익 기여</p>
              {myHoldings.map(h => (
                <div key={h.symbol} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{h.name}</span>
                    <span style={{ color: h.profitLoss >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {h.profitLoss >= 0 ? '+' : ''}{h.profitLossPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.abs(h.profitLossPercent) * 5}%`, background: h.profitLoss >= 0 ? 'var(--gain)' : 'var(--loss)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
