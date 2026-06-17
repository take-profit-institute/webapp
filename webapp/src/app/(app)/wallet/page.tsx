'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Wallet, Lock, CircleDollarSign, ArrowUpRight, ArrowDownRight, CalendarClock } from 'lucide-react';
import { amendReservation, cancelReservation, getAccount, getAccountBalance, getLockedOrders, getReservations, useApi } from '@/apis';
import type { ReservationKind, ReservationTiming } from '@/lib/api-types';
import { Loader, ErrorState } from '@/components/AsyncState';

const TIMING_LABEL: Record<string, string> = {
  open: '시가 (09:00)',
  prev_close: '전일종가 (08:30)',
  today_close: '당일종가 (15:40)',
};
const RSV_KIND_LABEL: Record<string, string> = {
  market: '시장가',
  limit: '지정가',
  after_hours_close: '시간외종가',
};
const RSV_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  reserved: { label: '예약', color: 'var(--amber)', bg: 'var(--amber-subtle)' },
  pending: { label: '대기', color: 'var(--amber)', bg: 'var(--amber-subtle)' },
  filled: { label: '체결', color: 'var(--gain)', bg: 'var(--gain-dim)' },
  cancelled: { label: '취소', color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
};

export default function WalletPage() {
  const { data: balance, loading, error, refetch } = useApi(() => getAccountBalance(), []);
  const { data: account } = useApi(() => getAccount(), []);
  const { data: reservations } = useApi(() => getLockedOrders(), []);
  const { data: scheduledRaw, refetch: refetchReservations } = useApi(() => getReservations(), []);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [amendTiming, setAmendTiming] = useState<ReservationTiming>('open');
  const [amendKind, setAmendKind] = useState<ReservationKind>('market');
  const [amendQty, setAmendQty] = useState('');
  const [amendPrice, setAmendPrice] = useState('');
  const [amendDate, setAmendDate] = useState('');
  const [mutatingReservationId, setMutatingReservationId] = useState<string | null>(null);
  const [reservationActionMessage, setReservationActionMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const scheduled = (scheduledRaw ?? []).filter((r) => !cancelledIds.has(r.id));
  const dateStr = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };
  const tomorrow = dateStr(1);
  const maxReservationDate = dateStr(7);

  const handleCancelReservation = async (id: string) => {
    setMutatingReservationId(id);
    setReservationActionMessage(null);
    setCancelledIds((prev) => new Set(prev).add(id)); // optimistic
    try {
      await cancelReservation(id);
      setReservationActionMessage({ ok: true, text: '예약 주문을 취소했습니다' });
      refetchReservations();
    } catch {
      setCancelledIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setReservationActionMessage({ ok: false, text: '예약 주문 취소에 실패했습니다' });
    } finally {
      setMutatingReservationId(null);
    }
  };

  const startAmendReservation = (reservation: NonNullable<typeof scheduledRaw>[number]) => {
    setEditingReservationId(reservation.id);
    setAmendTiming(reservation.timing);
    setAmendKind(reservation.orderKind);
    setAmendQty(String(reservation.quantity));
    setAmendPrice(String(reservation.price ?? ''));
    setAmendDate(reservation.scheduledDate);
    setReservationActionMessage(null);
  };

  const handleAmendReservation = async (id: string) => {
    const quantity = parseInt(amendQty) || 0;
    const price = parseInt(amendPrice) || 0;
    const orderKind = amendTiming === 'open' ? amendKind : 'after_hours_close';
    if (quantity < 1) {
      setReservationActionMessage({ ok: false, text: '정정 수량을 입력하세요' });
      return;
    }
    if (orderKind === 'limit' && price < 1) {
      setReservationActionMessage({ ok: false, text: '정정 지정가를 입력하세요' });
      return;
    }
    if (amendTiming !== 'prev_close' && (!amendDate || amendDate < tomorrow || amendDate > maxReservationDate)) {
      setReservationActionMessage({ ok: false, text: '실행 예정일은 내일부터 7일 이내여야 합니다' });
      return;
    }

    setMutatingReservationId(id);
    setReservationActionMessage(null);
    try {
      const amended = await amendReservation(id, {
        timing: amendTiming,
        orderKind,
        quantity,
        price: orderKind === 'limit' ? price : undefined,
        scheduledDate: amendTiming === 'prev_close' ? undefined : amendDate,
      });
      setReservationActionMessage({ ok: true, text: `예약 정정 접수 완료 · 원주문 ${amended.parentOrderId}` });
      setEditingReservationId(null);
      refetchReservations();
    } catch (e) {
      setReservationActionMessage({ ok: false, text: e instanceof Error ? e.message : '예약 주문 정정에 실패했습니다' });
    } finally {
      setMutatingReservationId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-6 max-w-[900px]">
        <Loader />
      </div>
    );
  }
  if (error || !balance) {
    return (
      <div className="p-3 md:p-6 max-w-[900px]">
        <ErrorState error={error ?? new Error('잔고를 불러올 수 없습니다')} onRetry={refetch} />
      </div>
    );
  }

  const { totalBalance, availableAmount, lockedAmount } = balance;
  const lockedPct = totalBalance > 0 ? (lockedAmount / totalBalance) * 100 : 0;
  const reserved = reservations ?? [];

  return (
    <div className="p-3 md:p-6 max-w-[900px]">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>잔고</h1>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>가용 가능 금액과 예약으로 묶인 금액을 확인하세요</p>
      </div>

      {/* 총 잔고 hero */}
      <div className="card p-5 md:p-6 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--amber-subtle)' }}>
              <Wallet size={15} style={{ color: 'var(--amber)' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>총 잔고</span>
          </div>
          {account && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: account.status === 'active' ? 'var(--gain-dim)' : 'var(--loss-dim)',
                color: account.status === 'active' ? 'var(--gain)' : 'var(--loss)',
                fontFamily: 'Noto Sans KR',
              }}>
              {account.status === 'active' ? '활성 계좌' : '비활성 계좌'}
            </span>
          )}
        </div>
        <p className="text-3xl md:text-4xl font-black font-mono mb-3" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
          {totalBalance.toLocaleString()}<span className="text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>원</span>
        </p>
        {/* 가용 vs 묶임 비율 바 */}
        <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-elevated)' }}>
          <div style={{ width: `${100 - lockedPct}%`, background: 'var(--gain)' }} />
          <div style={{ width: `${lockedPct}%`, background: 'var(--amber)' }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: 'var(--gain)', fontFamily: 'Noto Sans KR' }}>가용 {(100 - lockedPct).toFixed(0)}%</span>
          <span className="text-[10px]" style={{ color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>묶임 {lockedPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* 가용 / 묶인 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <CircleDollarSign size={14} style={{ color: 'var(--gain)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>가용 가능 금액</span>
          </div>
          <p className="text-lg md:text-2xl font-black font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
            {availableAmount.toLocaleString()}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>바로 주문 가능</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Lock size={14} style={{ color: 'var(--amber)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>묶인 금액</span>
          </div>
          <p className="text-lg md:text-2xl font-black font-mono" style={{ fontFamily: 'JetBrains Mono', color: 'var(--amber)' }}>
            {lockedAmount.toLocaleString()}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>미체결 주문 {reserved.length}건</p>
        </div>
      </div>

      {/* 묶인 내역 (미체결 지정가 주문) */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>묶인 내역 (미체결 지정가 주문)</p>
          <Link href="/portfolio" className="text-xs" style={{ color: 'var(--amber)' }}>거래 내역</Link>
        </div>
        {reserved.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>묶인 금액이 없습니다</p>
        ) : (
          reserved.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < reserved.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: r.type === 'buy' ? 'var(--gain-dim)' : 'var(--loss-dim)', color: r.type === 'buy' ? 'var(--gain)' : 'var(--loss)' }}>
                {r.type === 'buy' ? '매수' : '매도'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{r.name}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>체결 대기</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                  {r.executedAt.slice(0, 10)} {r.executedAt.slice(11, 16)} · {r.quantity}주 @ {r.price.toLocaleString()}원
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-bold" style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                  {(r.amount + r.fee).toLocaleString()}원
                </p>
                <div className="flex items-center justify-end gap-0.5">
                  {r.type === 'buy'
                    ? <ArrowUpRight size={10} style={{ color: 'var(--text-muted)' }} />
                    : <ArrowDownRight size={10} style={{ color: 'var(--text-muted)' }} />}
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>묶임</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 예약 주문 (RSV-009 목록 + RSV-016~018 취소) */}
      <div className="card overflow-hidden mt-3">
        <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <CalendarClock size={14} style={{ color: 'var(--amber)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>예약 주문</p>
        </div>
        {scheduled.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>예약된 주문이 없습니다</p>
        ) : (
          scheduled.map((r, i) => {
            const meta = RSV_STATUS_META[r.status] ?? RSV_STATUS_META.reserved;
            const cancellable = r.status === 'reserved';
            return (
              <div key={r.id} style={{ borderBottom: i < scheduled.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: r.type === 'buy' ? 'var(--gain-dim)' : 'var(--loss-dim)', color: r.type === 'buy' ? 'var(--gain)' : 'var(--loss)' }}>
                    {r.type === 'buy' ? '매수' : '매도'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{r.name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color, fontFamily: 'Noto Sans KR' }}>{meta.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>{RSV_KIND_LABEL[r.orderKind]}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                      {TIMING_LABEL[r.timing]} · {r.scheduledDate} · {r.quantity}주{r.price ? ` @ ${r.price.toLocaleString()}원` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                      {(r.amount + r.fee).toLocaleString()}원
                    </p>
                    {cancellable ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startAmendReservation(r)}
                          className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', fontFamily: 'Noto Sans KR' }}>
                          정정
                        </button>
                        <button onClick={() => handleCancelReservation(r.id)} disabled={mutatingReservationId === r.id}
                          className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--loss-dim)', color: 'var(--loss)', opacity: mutatingReservationId === r.id ? 0.5 : 1, fontFamily: 'Noto Sans KR' }}>
                          취소
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>취소/정정 불가</span>
                    )}
                  </div>
                </div>
                {editingReservationId === r.id && (
                  <div className="px-4 pb-3 grid grid-cols-2 gap-2" style={{ background: 'var(--bg-surface)' }}>
                    <select value={amendTiming}
                      onChange={e => {
                        const next = e.target.value as ReservationTiming;
                        setAmendTiming(next);
                        if (next !== 'open') setAmendKind('after_hours_close');
                        else if (amendKind === 'after_hours_close') setAmendKind('market');
                      }}
                      className="input-dark text-xs" style={{ fontFamily: 'Noto Sans KR' }}>
                      <option value="open">시가</option>
                      <option value="prev_close">전일종가</option>
                      <option value="today_close">당일종가</option>
                    </select>
                    <select value={amendTiming === 'open' ? amendKind : 'after_hours_close'}
                      disabled={amendTiming !== 'open'}
                      onChange={e => setAmendKind(e.target.value as ReservationKind)}
                      className="input-dark text-xs" style={{ fontFamily: 'Noto Sans KR' }}>
                      {amendTiming === 'open' ? (
                        <>
                          <option value="market">시장가</option>
                          <option value="limit">지정가</option>
                        </>
                      ) : (
                        <option value="after_hours_close">시간외종가</option>
                      )}
                    </select>
                    <input type="date" value={amendTiming === 'prev_close' ? tomorrow : amendDate}
                      min={tomorrow} max={maxReservationDate} disabled={amendTiming === 'prev_close'}
                      onChange={e => setAmendDate(e.target.value)}
                      className="input-dark text-xs" style={{ fontFamily: 'JetBrains Mono' }} />
                    <input type="number" min="1" step="1" value={amendQty}
                      onChange={e => setAmendQty(e.target.value.replace(/[.,]/g, ''))}
                      className="input-dark text-center text-xs font-mono" placeholder="수량" style={{ fontFamily: 'JetBrains Mono' }} />
                    {amendTiming === 'open' && amendKind === 'limit' && (
                      <input type="number" min="1" step="1" value={amendPrice}
                        onChange={e => setAmendPrice(e.target.value.replace(/[.,]/g, ''))}
                        className="input-dark text-right text-xs font-mono col-span-2" placeholder="지정가" style={{ fontFamily: 'JetBrains Mono' }} />
                    )}
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <button onClick={() => handleAmendReservation(r.id)} disabled={mutatingReservationId === r.id}
                        className="text-xs py-2 rounded-lg font-bold"
                        style={{ background: 'var(--amber-subtle)', color: 'var(--amber)', opacity: mutatingReservationId === r.id ? 0.5 : 1, fontFamily: 'Noto Sans KR' }}>
                        정정 접수
                      </button>
                      <button onClick={() => setEditingReservationId(null)}
                        className="text-xs py-2 rounded-lg font-bold"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontFamily: 'Noto Sans KR' }}>
                        닫기
                      </button>
                    </div>
                  </div>
                )}
                {reservationActionMessage && (editingReservationId === r.id || mutatingReservationId === r.id) && (
                  <p className="text-xs text-center px-4 pb-3" style={{ color: reservationActionMessage.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
                    {reservationActionMessage.text}
                  </p>
                  )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-[11px] mt-3 px-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
        * 가상계좌이므로 실제 출금은 지원하지 않습니다.
      </p>
    </div>
  );
}
