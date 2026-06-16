'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Star } from 'lucide-react';
import CandleChart from '@/components/CandleChart';
import { stockList, generateCandleData } from '@/lib/mock-data';

export default function StockDetailClient({ symbol }: { symbol: string }) {
  const stock = stockList.find(s => s.symbol === symbol) ?? stockList[0];
  const candles = generateCandleData(stock.price, 60, parseInt(symbol.replace(/\D/g, '') || '42'));

  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [activeTab, setActiveTab] = useState('차트');

  const tabs = ['차트', '기업정보', '재무', '뉴스'];
  const qty = parseInt(quantity) || 0;
  const total = qty * stock.price;

  return (
    <div className="p-3 md:p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/market" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={15} />
        </Link>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
            style={{ background: 'var(--bg-elevated)', color: 'var(--amber)', border: '1px solid var(--border-normal)', fontFamily: 'JetBrains Mono' }}>
            {stock.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-lg md:text-xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>{stock.name}</h1>
              <span className="badge-amber hidden sm:inline">{stock.exchange}</span>
              <span className="badge-amber hidden sm:inline">{stock.sector}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{symbol}</p>
          </div>
        </div>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <Star size={14} />
        </button>
      </div>

      {/* Mobile: stacked layout | Desktop: side-by-side */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: chart + info */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Price card */}
          <div className="card p-4 md:p-5">
            <div className="flex items-end gap-2 mb-1">
              <span className="text-2xl md:text-4xl font-black font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
                {stock.price.toLocaleString()}
              </span>
              <span className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>KRW</span>
            </div>
            <div className="flex items-center gap-2">
              {stock.change >= 0 ? <ArrowUpRight size={15} style={{ color: 'var(--gain)' }} /> : <ArrowDownRight size={15} style={{ color: 'var(--loss)' }} />}
              <span className="font-mono font-bold text-sm" style={{ color: stock.change >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toLocaleString()} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
            </div>
            {/* Key stats — scroll on mobile */}
            <div className="flex gap-4 overflow-x-auto mt-3 pt-3 scrollbar-none" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {[
                { label: '시가총액', value: stock.marketCap },
                { label: '거래량', value: stock.volume },
                { label: '52주 최고', value: Math.round(stock.price * 1.35).toLocaleString() },
                { label: '52주 최저', value: Math.round(stock.price * 0.72).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="shrink-0">
                  <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
                  <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs + content */}
          <div className="card p-4 md:p-5">
            <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-none" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className="px-3 py-1.5 text-sm rounded-lg transition-all shrink-0"
                  style={{
                    background: activeTab === t ? 'var(--amber-subtle)' : 'transparent',
                    color: activeTab === t ? 'var(--amber)' : 'var(--text-secondary)',
                    fontFamily: 'Noto Sans KR',
                    border: activeTab === t ? '1px solid rgba(245,166,35,0.2)' : '1px solid transparent',
                  }}>
                  {t}
                </button>
              ))}
            </div>

            {activeTab === '차트' && <CandleChart data={candles} height={220} />}

            {activeTab === '기업정보' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                  <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>기업 개요</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                    {stock.name}은(는) {stock.sector} 분야의 선도적인 기업으로, 글로벌 시장에서 혁신적인 제품과 서비스를 제공하고 있습니다.
                    지속적인 R&D 투자와 기술 혁신을 통해 시장 점유율을 확대하고 있습니다.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: '업종', value: stock.sector }, { label: '거래소', value: stock.exchange }, { label: '시가총액', value: stock.marketCap }, { label: '코드', value: symbol }].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === '재무' && (
              <div className="space-y-0">
                {['매출액', '영업이익', '순이익', 'PER', 'PBR', 'ROE'].map((item, i) => {
                  const values = ['42.6조', '6.8조', '4.2조', '18.4x', '1.82x', '9.8%'];
                  return (
                    <div key={item} className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{item}</span>
                      <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{values[i]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === '뉴스' && (
              <div className="space-y-2">
                {[
                  { title: `${stock.name}, 2분기 실적 시장 예상치 상회`, time: '2시간 전', source: '한국경제' },
                  { title: `외국인 투자자 ${stock.name} 순매수세 지속`, time: '4시간 전', source: '매일경제' },
                  { title: `${stock.sector} 업황 개선 전망`, time: '어제', source: '이데일리' },
                ].map((n, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{n.title}</p>
                    <div className="flex gap-2 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                      <span>{n.source}</span><span>·</span><span>{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trade panel — sticky on desktop, normal flow on mobile */}
        <div className="lg:w-72 lg:shrink-0">
          <div className="card p-4 md:p-5 lg:sticky lg:top-6">
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>주문</h2>

            {/* Buy/Sell toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--bg-surface)' }}>
              <button onClick={() => setTradeType('buy')}
                className="py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: tradeType === 'buy' ? 'var(--gain)' : 'transparent', color: tradeType === 'buy' ? '#000' : 'var(--text-secondary)' }}>
                매수
              </button>
              <button onClick={() => setTradeType('sell')}
                className="py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: tradeType === 'sell' ? 'var(--loss)' : 'transparent', color: tradeType === 'sell' ? '#fff' : 'var(--text-secondary)' }}>
                매도
              </button>
            </div>

            <div className="flex justify-between items-center mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>현재가</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{stock.price.toLocaleString()}</span>
                <span className="text-xs" style={{ color: stock.change >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>수량 (주)</label>
              <div className="flex gap-2">
                <button onClick={() => setQuantity(q => String(Math.max(0, parseInt(q || '0') - 1)))}
                  className="w-9 h-10 rounded-lg font-bold text-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-normal)', color: 'var(--text-primary)' }}>−</button>
                <input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)}
                  placeholder="0" className="input-dark text-center font-mono font-bold" style={{ fontFamily: 'JetBrains Mono' }} />
                <button onClick={() => setQuantity(q => String(parseInt(q || '0') + 1))}
                  className="w-9 h-10 rounded-lg font-bold text-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-normal)', color: 'var(--text-primary)' }}>+</button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[10, 25, 50, 100].map(pct => (
                  <button key={pct} className="py-1 rounded-md text-xs transition-all"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    {pct === 100 ? '최대' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl mb-4 space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              {[
                { label: '주문 수량', value: `${qty}주` },
                { label: '주문 단가', value: `${stock.price.toLocaleString()}원` },
                { label: '수수료', value: `${Math.round(total * 0.00015).toLocaleString()}원` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>총 주문금액</span>
                <span style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>{total.toLocaleString()}원</span>
              </div>
            </div>

            <button className={`${tradeType === 'buy' ? 'btn-gain' : 'btn-loss'} text-sm`}>
              {tradeType === 'buy' ? '매수 주문' : '매도 주문'}
            </button>
            <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
              가용 현금: <span style={{ color: 'var(--text-secondary)' }}>2,125,780원</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
