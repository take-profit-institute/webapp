'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Star, Clock } from 'lucide-react';
import CandleChart from '@/components/CandleChart';
import {
  addWatchlist,
  getAccountBalance,
  getCandles,
  getHoldings,
  getMarketStatus,
  getOrders,
  getStock,
  getStockNews,
  getWatchlist,
  placeOrder,
  removeWatchlist,
  useApi,
} from '@/apis';
import { useAuthStore } from '@/store/useStore';
import { Loader, ErrorState } from '@/components/AsyncState';
import { formatMarketCap, formatVolume } from '@/lib/format';

export default function StockDetailClient({ symbol }: { symbol: string }) {
  const router = useRouter();
  const { data: stock, loading, error, refetch } = useApi(() => getStock(symbol), [symbol]);
  const { data: candles } = useApi(() => getCandles(symbol, { limit: 60 }), [symbol]);
  const { data: news } = useApi(() => getStockNews(symbol), [symbol]);
  const { data: watchlist } = useApi(() => getWatchlist(), []);
  const { data: balance } = useApi(() => getAccountBalance(), []);
  const { data: holdings } = useApi(() => getHoldings(), []);
  const { data: marketStatus } = useApi(() => getMarketStatus(), []);
  const { data: myOrders, refetch: refetchOrders } = useApi(() => getOrders({ symbol }), [symbol]);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [orderKind, setOrderKind] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
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
  const limitPriceNum = parseInt(limitPrice) || 0;
  const effectivePrice = orderKind === 'limit' ? limitPriceNum : stock.price;
  const total = qty * effectivePrice;
  const fee = Math.round(total * 0.00015);

  // 주문 사전 검증 (ORD-007/008/009)
  const available = balance?.availableAmount ?? 0;
  const heldQty = holdings?.find((h) => h.symbol === stock.symbol)?.quantity ?? 0;
  const hasPending = myOrders?.some((o) => o.status === 'pending') ?? false;
  const marketClosed = marketStatus ? !marketStatus.open : false;

  let validationError: string | null = null;
  if (qty >= 1) {
    if (orderKind === 'limit' && limitPriceNum < 1) validationError = '지정가 가격을 입력하세요';
    else if (hasPending) validationError = '이미 대기 중인 주문이 있습니다 (종목당 1건)';
    else if (tradeType === 'buy' && total + fee > available) validationError = '가용 금액이 부족합니다';
    else if (tradeType === 'sell' && qty > heldQty) validationError = `보유 수량(${heldQty}주)을 초과했습니다`;
  }
  const canSubmit = isLoggedIn && qty >= 1 && !validationError && !placing;

  const handleOrder = async () => {
    if (!isLoggedIn) {
      router.push('/login'); // ORD-001
      return;
    }
    if (qty < 1 || validationError) return;
    setPlacing(true);
    setOrderStatus(null);
    try {
      const tx = await placeOrder({
        symbol: stock.symbol,
        type: tradeType,
        orderKind,
        quantity: qty,
        price: orderKind === 'limit' ? limitPriceNum : undefined,
      });
      const label = tradeType === 'buy' ? '매수' : '매도';
      const message =
        tx.status === 'filled'
          ? `${label} 체결 완료 · ${tx.amount.toLocaleString()}원`
          : `${label} 예약 접수됨 (${orderKind === 'limit' ? '지정가' : '시장가·장마감'}) · ${tx.amount.toLocaleString()}원`;
      setOrderStatus({ ok: true, message });
      setQuantity('');
      setLimitPrice('');
      refetchOrders();
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>주문</h2>
              {/* 장 운영 상태 (ORD-012) */}
              {marketStatus && (
                <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: marketStatus.open ? 'var(--gain-dim)' : 'var(--bg-surface)', color: marketStatus.open ? 'var(--gain)' : 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: marketStatus.open ? 'var(--gain)' : 'var(--text-muted)' }} />
                  {marketStatus.open ? '정규장' : '장 마감'}
                </span>
              )}
            </div>

            {/* Buy/Sell toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-3" style={{ background: 'var(--bg-surface)' }}>
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

            {/* 주문 유형: 시장가 / 지정가 (ORD-002/003) */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-3" style={{ background: 'var(--bg-surface)' }}>
              {(['market', 'limit'] as const).map(kind => (
                <button key={kind} onClick={() => setOrderKind(kind)}
                  className="py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: orderKind === kind ? 'var(--amber-subtle)' : 'transparent', color: orderKind === kind ? 'var(--amber)' : 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                  {kind === 'market' ? '시장가' : '지정가'}
                </button>
              ))}
            </div>

            {/* 장 마감 안내 — 시장가 즉시주문은 예약으로 유도 (ORD-012) */}
            {marketClosed && orderKind === 'market' && (
              <div className="flex items-start gap-1.5 p-2.5 rounded-lg mb-3" style={{ background: 'var(--amber-subtle)', border: '1px solid rgba(245,166,35,0.2)' }}>
                <Clock size={12} style={{ color: 'var(--amber)', marginTop: 1 }} />
                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                  지금은 정규장 시간이 아닙니다. 시장가 주문은 <b style={{ color: 'var(--amber)' }}>예약 주문</b>으로 접수됩니다.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center mb-3 p-3 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>현재가</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{stock.price.toLocaleString()}</span>
                <span className="text-xs" style={{ color: stock.change >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* 지정가 가격 입력 (ORD-003/011 — 정수만) */}
            {orderKind === 'limit' && (
              <div className="mb-3">
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>지정가 (원, 1원 단위)</label>
                <input type="number" min="0" step="1" value={limitPrice}
                  onChange={e => setLimitPrice(e.target.value.replace(/[.,]/g, ''))}
                  placeholder={stock.price.toLocaleString()}
                  className="input-dark text-right font-mono font-bold" style={{ fontFamily: 'JetBrains Mono' }} />
              </div>
            )}

            <div className="mb-3">
              <label className="flex items-center justify-between text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
                <span>수량 (주)</span>
                {tradeType === 'sell' && <span style={{ color: 'var(--text-muted)' }}>보유 {heldQty}주</span>}
              </label>
              <div className="flex gap-2">
                <button onClick={() => setQuantity(q => String(Math.max(0, parseInt(q || '0') - 1)))}
                  className="w-9 h-10 rounded-lg font-bold text-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-normal)', color: 'var(--text-primary)' }}>−</button>
                <input type="number" min="0" step="1" value={quantity}
                  onChange={e => setQuantity(e.target.value.replace(/[.,]/g, ''))}
                  placeholder="0" className="input-dark text-center font-mono font-bold" style={{ fontFamily: 'JetBrains Mono' }} />
                <button onClick={() => setQuantity(q => String(parseInt(q || '0') + 1))}
                  className="w-9 h-10 rounded-lg font-bold text-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-normal)', color: 'var(--text-primary)' }}>+</button>
              </div>
            </div>

            <div className="p-3 rounded-xl mb-3 space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              {[
                { label: '주문 유형', value: orderKind === 'market' ? '시장가' : '지정가' },
                { label: '주문 수량', value: `${qty}주` },
                { label: '주문 단가', value: `${effectivePrice.toLocaleString()}원` },
                { label: '수수료', value: `${fee.toLocaleString()}원` },
                ...(tradeType === 'buy' ? [{ label: '가용 금액', value: `${available.toLocaleString()}원` }] : []),
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

            {/* 사전 검증 메시지 (ORD-007/008/009) */}
            {validationError && (
              <p className="text-xs mb-2 text-center" style={{ color: 'var(--loss)', fontFamily: 'Noto Sans KR' }}>{validationError}</p>
            )}

            {!isLoggedIn ? (
              // ORD-001
              <button onClick={() => router.push('/login')} className="btn-outline w-full text-sm">
                로그인 후 주문 가능
              </button>
            ) : (
              <button onClick={handleOrder} disabled={!canSubmit}
                className={`${tradeType === 'buy' ? 'btn-gain' : 'btn-loss'} text-sm`}
                style={{ opacity: canSubmit ? 1 : 0.5 }}>
                {placing
                  ? '처리 중...'
                  : `${tradeType === 'buy' ? '매수' : '매도'} ${orderKind === 'limit' || marketClosed ? '예약' : '주문'}`}
              </button>
            )}
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
