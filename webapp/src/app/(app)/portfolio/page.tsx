'use client';
import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  amendOrder,
  cancelOrder,
  getAccountBalance,
  getAllocation,
  getHoldings,
  getOrders,
  getPortfolioHistory,
  useApi,
} from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { clearIdempotencyKey, resolveIdempotencyKey } from '@/lib/idempotency';
import { sectorColor } from '@/lib/format';

const tabs = ['보유 종목', '과거 보유', '주문 내역', '수익 분석'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  filled: { label: '체결', color: 'var(--gain)', bg: 'var(--gain-dim)' },
  pending: { label: '대기', color: 'var(--amber)', bg: 'var(--amber-subtle)' },
  cancelled: { label: '취소', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
};

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('보유 종목');
  const [expandedHolding, setExpandedHolding] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [amendQty, setAmendQty] = useState('');
  const [amendPrice, setAmendPrice] = useState('');
  const [mutatingOrderId, setMutatingOrderId] = useState<string | null>(null);
  const [orderActionMessage, setOrderActionMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: holdings, loading, error, refetch } = useApi(() => getHoldings({ includeInactive: true }), []);
  const { data: balance, refetch: refetchBalance } = useApi(() => getAccountBalance(), []);
  const { data: orders, refetch: refetchOrders } = useApi(() => getOrders(), []);
  const { data: history } = useApi(() => getPortfolioHistory(30), []);
  const { data: allocation } = useApi(() => getAllocation(), []);

  if (loading) {
    return (
      <div className="p-3 md:p-6 max-w-[1200px]">
        <Loader />
      </div>
    );
  }
  if (error || !holdings) {
    return (
      <div className="p-3 md:p-6 max-w-[1200px]">
        <ErrorState error={error ?? new Error('포트폴리오를 불러올 수 없습니다')} onRetry={refetch} />
      </div>
    );
  }

  const myHoldings = holdings.filter((h) => h.isActive);
  const inactiveHoldings = holdings.filter((h) => !h.isActive);
  const orderList = orders ?? [];
  const portfolioHistory = history ?? [];
  const sectorAllocation = allocation ?? [];
  // 잔고 분리 (ACC-004): 총 = 가용 + 묶인
  const available = balance?.availableAmount ?? 0;
  const locked = balance?.lockedAmount ?? 0;
  const totalCash = balance?.totalBalance ?? available + locked;

  const totalValue = myHoldings.reduce((s, h) => s + h.totalValue, 0);
  const totalPL = myHoldings.reduce((s, h) => s + h.profitLoss, 0);
  const totalPLPct = totalValue - totalPL !== 0 ? (totalPL / (totalValue - totalPL)) * 100 : 0;
  const histMin = portfolioHistory.length ? Math.min(...portfolioHistory.map(d => d.value)) : 0;
  const histMax = portfolioHistory.length ? Math.max(...portfolioHistory.map(d => d.value)) : 1;

  const canCancelOrAmend = (order: typeof orderList[number]) => order.status === 'pending' && order.orderKind === 'limit';

  const startAmendOrder = (order: typeof orderList[number]) => {
    setEditingOrderId(order.id);
    setAmendQty(String(order.quantity));
    setAmendPrice(String(order.price));
    setOrderActionMessage(null);
  };

  const handleCancelOrder = async (id: string) => {
    setMutatingOrderId(id);
    setOrderActionMessage(null);
    try {
      const scope = `cancel-order:${id}`;
      const result = await cancelOrder(id, resolveIdempotencyKey(scope));
      clearIdempotencyKey(scope); // 성공 — 다음 취소 의도는 새 키
      setOrderActionMessage({ ok: true, text: `주문 취소 완료 · ${result.releasedAmount.toLocaleString()}원 반환` });
      refetchOrders();
      refetchBalance();
    } catch (e) {
      setOrderActionMessage({ ok: false, text: e instanceof Error ? e.message : '주문 취소에 실패했습니다' });
    } finally {
      setMutatingOrderId(null);
    }
  };

  const handleAmendOrder = async (id: string) => {
    const quantity = parseInt(amendQty) || 0;
    const price = parseInt(amendPrice) || 0;
    if (quantity < 1 || price < 1) {
      setOrderActionMessage({ ok: false, text: '정정 수량과 지정가를 입력하세요' });
      return;
    }
    setMutatingOrderId(id);
    setOrderActionMessage(null);
    try {
      const scope = `amend-order:${id}`;
      const amended = await amendOrder(id, { quantity, price }, resolveIdempotencyKey(scope, JSON.stringify({ quantity, price })));
      clearIdempotencyKey(scope); // 성공 — 다음 정정 의도는 새 키
      setOrderActionMessage({ ok: true, text: `정정 접수 완료 · 원주문 ${amended.parentOrderId}` });
      setEditingOrderId(null);
      refetchOrders();
      refetchBalance();
    } catch (e) {
      setOrderActionMessage({ ok: false, text: e instanceof Error ? e.message : '주문 정정에 실패했습니다' });
    } finally {
      setMutatingOrderId(null);
    }
  };

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
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>총 평가 자산</p>
              <p className="text-2xl md:text-3xl font-black font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
                {(totalValue + totalCash).toLocaleString()}<span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>원</span>
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ArrowUpRight size={13} style={{ color: 'var(--gain)' }} />
                <span className="text-xs md:text-sm font-mono font-bold" style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono' }}>
                  +{totalPL.toLocaleString()}원 (+{totalPLPct.toFixed(2)}%)
                </span>
              </div>
            </div>
            {/* 잔고 분리 조회 (ACC-004): 총 잔고 / 묶인 / 가용 */}
            <div className="text-right hidden sm:block space-y-1">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>총 잔고</p>
                <p className="text-base font-mono font-bold" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{totalCash.toLocaleString()}원</p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>가용</p>
                  <p className="text-xs font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--gain)' }}>{available.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>묶인 금액</p>
                  <p className="text-xs font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>{locked.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          <svg width="100%" height="90" viewBox="0 0 500 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5A623" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
              </linearGradient>
            </defs>
            {portfolioHistory.length > 1 && (() => {
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
                  return <path key={i} d={`M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2} L${ix1} ${iy1} A${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2}Z`} fill={sectorColor(s.sector, i)} opacity={0.85} />;
                });
              })()}
            </svg>
            <div className="flex-1 md:w-full space-y-1.5">
              {sectorAllocation.map((s, i) => (
                <div key={s.sector} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: sectorColor(s.sector, i) }} />
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
            {myHoldings.length === 0 && (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>보유 종목이 없습니다</p>
            )}
            {myHoldings.map((h, i) => (
              <div key={h.symbol}>
                {/* Mobile card */}
                <button onClick={() => setExpandedHolding(expandedHolding === h.symbol ? null : h.symbol)}
                  className="md:hidden w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
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
                </button>
                {/* Desktop row */}
                <button onClick={() => setExpandedHolding(expandedHolding === h.symbol ? null : h.symbol)}
                  className="hidden md:grid w-full px-5 py-4 transition-colors text-left hover:bg-[var(--bg-elevated)]"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderBottom: i < myHoldings.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
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
                </button>
                {expandedHolding === h.symbol && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 md:px-5 py-3" style={{ background: 'var(--bg-surface)', borderBottom: i < myHoldings.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    {[
                      { label: '종목코드', value: h.symbol },
                      { label: '상태', value: h.isActive ? '보유중' : '과거 보유' },
                      { label: '평균단가', value: `${h.avgPrice.toLocaleString()}원` },
                      { label: '매입금액', value: `${h.costBasis.toLocaleString()}원` },
                      { label: '평가금액', value: `${h.totalValue.toLocaleString()}원` },
                      { label: '미실현손익', value: `${h.profitLoss >= 0 ? '+' : ''}${h.profitLoss.toLocaleString()}원` },
                      { label: '실현손익', value: `${h.realizedProfit >= 0 ? '+' : ''}${h.realizedProfit.toLocaleString()}원` },
                      { label: '갱신일시', value: `${h.updatedAt.slice(0, 10)} ${h.updatedAt.slice(11, 16)}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-2 text-xs">
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                        <span className="text-right" style={{ color: label.includes('손익') && String(value).startsWith('-') ? 'var(--loss)' : label.includes('손익') ? 'var(--gain)' : 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === '과거 보유' && (
          <div>
            {inactiveHoldings.length === 0 && (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>과거 보유 이력이 없습니다</p>
            )}
            {inactiveHoldings.map((h, i) => (
              <div key={h.symbol} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < inactiveHoldings.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  {h.name.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{h.name}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>비활성</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                    {h.symbol} · 최종 갱신 {h.updatedAt.slice(0, 10)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold" style={{ color: h.realizedProfit >= 0 ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                    {h.realizedProfit >= 0 ? '+' : ''}{h.realizedProfit.toLocaleString()}원
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>실현손익</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 주문 내역 (ORD-004) + 클릭 시 상세 (ORD-005) */}
        {activeTab === '주문 내역' && (
          <div>
            {orderList.length === 0 && (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>주문 내역이 없습니다</p>
            )}
            {orderList.map((o, i) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.filled;
              const expanded = expandedOrder === o.id;
              return (
                <div key={o.id} style={{ borderBottom: i < orderList.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <button onClick={() => setExpandedOrder(expanded ? null : o.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: o.type === 'buy' ? 'var(--gain-dim)' : 'var(--loss-dim)', color: o.type === 'buy' ? 'var(--gain)' : 'var(--loss)' }}>
                      {o.type === 'buy' ? '매수' : '매도'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{o.name}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color, fontFamily: 'Noto Sans KR' }}>{meta.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                          {o.orderKind === 'limit' ? '지정가' : '시장가'}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{o.executedAt.slice(0, 10)} {o.executedAt.slice(11, 16)} · {o.quantity}주 @ {o.price.toLocaleString()}원</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{(o.amount / 10000).toFixed(0)}만원</p>
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3 pt-1 grid grid-cols-2 gap-x-4 gap-y-1.5" style={{ background: 'var(--bg-surface)' }}>
                      {[
                        { label: '주문 ID', value: o.id },
                        { label: '상태', value: meta.label },
                        { label: '유형', value: o.orderKind === 'limit' ? '지정가' : '시장가' },
                        { label: '구분', value: o.type === 'buy' ? '매수' : '매도' },
                        { label: '수량', value: `${o.quantity}주` },
                        { label: '단가', value: `${o.price.toLocaleString()}원` },
                        { label: '체결 금액', value: `${o.amount.toLocaleString()}원` },
                        { label: '수수료', value: `${o.fee.toLocaleString()}원` },
                        { label: '일시', value: `${o.executedAt.slice(0, 10)} ${o.executedAt.slice(11, 16)}` },
                        ...(o.parentOrderId ? [{ label: '원 주문', value: o.parentOrderId }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-xs py-0.5">
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</span>
                          <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{value}</span>
                        </div>
                      ))}
                      <div className="col-span-2 pt-2 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        {canCancelOrAmend(o) ? (
                          <div className="space-y-2">
                            {editingOrderId === o.id ? (
                              <div className="grid grid-cols-2 gap-2">
                                <input type="number" inputMode="numeric" min="1" step="1" value={amendQty}
                                  onChange={e => setAmendQty(e.target.value.replace(/[.,]/g, ''))}
                                  className="input-dark text-center text-xs font-mono" placeholder="수량" style={{ fontFamily: 'JetBrains Mono' }} />
                                <input type="number" inputMode="numeric" min="1" step="1" value={amendPrice}
                                  onChange={e => setAmendPrice(e.target.value.replace(/[.,]/g, ''))}
                                  className="input-dark text-right text-xs font-mono" placeholder="지정가" style={{ fontFamily: 'JetBrains Mono' }} />
                              </div>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2">
                              {editingOrderId === o.id ? (
                                <button onClick={() => handleAmendOrder(o.id)} disabled={mutatingOrderId === o.id}
                                  className="text-xs py-2 rounded-lg font-bold"
                                  style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', opacity: mutatingOrderId === o.id ? 0.5 : 1, fontFamily: 'Noto Sans KR' }}>
                                  정정 접수
                                </button>
                              ) : (
                                <button onClick={() => startAmendOrder(o)}
                                  className="text-xs py-2 rounded-lg font-bold"
                                  style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>
                                  정정
                                </button>
                              )}
                              <button onClick={() => handleCancelOrder(o.id)} disabled={mutatingOrderId === o.id}
                                className="text-xs py-2 rounded-lg font-bold"
                                style={{ background: 'var(--loss-dim)', color: 'var(--loss)', opacity: mutatingOrderId === o.id ? 0.5 : 1, fontFamily: 'Noto Sans KR' }}>
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-center py-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                            PENDING 상태의 지정가 주문만 취소/정정할 수 있습니다
                          </p>
                        )}
                        {orderActionMessage && expandedOrder === o.id && (
                          <p className="text-xs text-center mt-2" style={{ color: orderActionMessage.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
                            {orderActionMessage.text}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{label}</p>
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
