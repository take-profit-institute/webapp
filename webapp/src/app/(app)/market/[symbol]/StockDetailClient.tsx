'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Star } from 'lucide-react';
import CandleChart from '@/components/CandleChart';
import { addWatchlist, getStock, getCandles, getStockNews, getWatchlist, placeOrder, removeWatchlist, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { formatMarketCap, formatVolume } from '@/lib/format';

export default function StockDetailClient({ symbol }: { symbol: string }) {
  const { data: stock, loading, error, refetch } = useApi(() => getStock(symbol), [symbol]);
  const { data: candles } = useApi(() => getCandles(symbol, { limit: 60 }), [symbol]);
  const { data: news } = useApi(() => getStockNews(symbol), [symbol]);
  const { data: watchlist } = useApi(() => getWatchlist(), []);

  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [activeTab, setActiveTab] = useState('차트');
  const [orderStatus, setOrderStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  // null = follow the fetched watchlist; true/false = optimistic local override.
  const [watchedOverride, setWatchedOverride] = useState<boolean | null>(null);
  const watched = watchedOverride ?? (watchlist?.some((q) => q.symbol === symbol) ?? false);

  const toggleWatch = async () => {
    const next = !watched;
    setWatchedOverride(next); // optimistic
    try {
      if (next) await addWatchlist(symbol);
      else await removeWatchlist(symbol);
    } catch {
      setWatchedOverride(!next); // revert on failure
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-6 max-w-[1400px]">
        <Loader />
      </div>
    );
  }
  if (error || !stock) {
    return (
      <div className="p-3 md:p-6 max-w-[1400px]">
        <ErrorState error={error ?? new Error(`종목을 찾을 수 없습니다: ${symbol}`)} onRetry={refetch} />
      </div>
    );
  }

  const tabs = ['차트', '기업정보', '재무', '뉴스'];
  const qty = parseInt(quantity) || 0;
  const total = qty * stock.price;

  const handleOrder = async () => {
    if (qty < 1) return;
    setPlacing(true);
    setOrderStatus(null);
    try {
      const tx = await placeOrder({ symbol: stock.symbol, type: tradeType, quantity: qty });
      setOrderStatus({ ok: true, message: `${tradeType === 'buy' ? '매수' : '매도'} 체결 완료 · ${tx.amount.toLocaleString()}원` });
      setQuantity('');
    } catch (e) {
      setOrderStatus({ ok: false, message: e instanceof Error ? e.message : '주문에 실패했습니다' });
    } finally {
      setPlacing(false);
    }
  };

  const financialRows: { label: string; value: string }[] = [
    { label: '매출액', value: formatMarketCap(stock.financials.revenue, stock.currency) },
    { label: '영업이익', value: formatMarketCap(stock.financials.operatingProfit, stock.currency) },
    { label: '순이익', value: formatMarketCap(stock.financials.netIncome, stock.currency) },
    { label: 'PER', value: `${stock.financials.per}x` },
    { label: 'PBR', value: `${stock.financials.pbr}x` },
    { label: 'ROE', value: `${stock.financials.roe}%` },
  ];

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
        <button onClick={toggleWatch} aria-pressed={watched} title={watched ? '관심종목 제거' : '관심종목 추가'}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: watched ? 'var(--amber)' : 'var(--text-secondary)' }}>
          <Star size={14} fill={watched ? 'var(--amber)' : 'none'} />
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
              <span className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{stock.currency}</span>
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
                { label: '시가총액', value: formatMarketCap(stock.marketCap, stock.currency) },
                { label: '거래량', value: formatVolume(stock.volume) },
                { label: '52주 최고', value: stock.high52w.toLocaleString() },
                { label: '52주 최저', value: stock.low52w.toLocaleString() },
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

            {activeTab === '차트' && (candles ? <CandleChart data={candles} height={220} /> : <Loader label="차트 불러오는 중..." />)}

            {activeTab === '기업정보' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                  <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>기업 개요</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                    {stock.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: '업종', value: stock.sector }, { label: '거래소', value: stock.exchange }, { label: '시가총액', value: formatMarketCap(stock.marketCap, stock.currency) }, { label: '코드', value: symbol }].map(({ label, value }) => (
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
                {financialRows.map((row, i) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: i < financialRows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{row.label}</span>
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === '뉴스' && (
              <div className="space-y-2">
                {(news ?? []).map((n) => (
                  <div key={n.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{n.title}</p>
                    <div className="flex gap-2 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                      <span>{n.source}</span><span>·</span><span>{new Date(n.publishedAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                ))}
                {news && news.length === 0 && (
                  <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>관련 뉴스가 없습니다</p>
                )}
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

            <button onClick={handleOrder} disabled={qty < 1 || placing}
              className={`${tradeType === 'buy' ? 'btn-gain' : 'btn-loss'} text-sm`}
              style={{ opacity: qty < 1 || placing ? 0.5 : 1 }}>
              {placing ? '처리 중...' : tradeType === 'buy' ? '매수 주문' : '매도 주문'}
            </button>
            {orderStatus && (
              <p className="text-center text-xs mt-2" style={{ color: orderStatus.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
                {orderStatus.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
