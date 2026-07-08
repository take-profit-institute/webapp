'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import MiniSparkline from '@/components/MiniSparkline';
import WatchlistButton from '@/components/WatchlistButton';
import { getWatchlist, getSparklines, useApi } from '@/apis';
import { Loader, ErrorState } from '@/components/AsyncState';
import { generateSparkline, symbolSeed } from '@/lib/chart-utils';
import { marketDetailHref } from '@/lib/market-routes';
import { useWatchlistStore } from '@/store/useStore';

export default function WatchlistPage() {
  const { data, loading, error, refetch } = useApi(() => getWatchlist(), []);
  const { data: sparklines } = useApi(() => getSparklines(14), []);
  const { setSymbols } = useWatchlistStore();

  // sync store with fetched list
  useEffect(() => {
    if (data) setSymbols(data.map((q) => q.symbol));
  }, [data, setSymbols]);

  const { isWatching } = useWatchlistStore();
  // 별표 취소 즉시 목록에서 제거(낙관적). 실패 시 onChange 롤백으로 복원.
  const [removedSymbols, setRemovedSymbols] = useState<Set<string>>(new Set());
  const allStocks = data ?? [];
  const stocks = allStocks.filter((s) => isWatching(s.symbol) && !removedSymbols.has(s.symbol));
  const sparklinesMap = sparklines ?? {};

  const handleWatchChange = (symbol: string, watching: boolean) => {
    setRemovedSymbols((prev) => {
      const next = new Set(prev);
      if (watching) next.delete(symbol); // 롤백(다시 관심 등록됨)
      else next.add(symbol); // 낙관적 제거
      return next;
    });
  };

  return (
    <div className="p-3 md:p-6 max-w-[900px]">
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Star size={18} style={{ color: 'var(--amber)' }} fill="var(--amber)" />
          <h1 className="text-xl md:text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>관심종목</h1>
        </div>
        <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>
          {stocks.length > 0 ? `${stocks.length}개 종목 등록됨` : '관심 종목을 추가해 실시간 알림을 받아보세요'}
        </p>
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && stocks.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--amber-subtle)' }}>
            <Star size={28} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>관심종목이 없습니다</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>종목 상세 페이지에서 ★ 버튼으로 추가할 수 있어요</p>
          </div>
          <Link href="/market" className="btn-amber text-sm px-5 py-2 flex items-center gap-1.5">
            <TrendingUp size={14} />
            시장 둘러보기
          </Link>
        </div>
      )}

      {!loading && !error && stocks.length > 0 && (
        <div className="space-y-2">
          {stocks.map((s) => {
            const closes = sparklinesMap[s.symbol] ?? [];
            const spark = closes.length >= 2 ? closes : generateSparkline(s.price, 12, symbolSeed(s.symbol));
            const firstClose = closes[0] ?? s.price;
            const lastClose = closes[closes.length - 1] ?? s.price;
            const twChangePct = closes.length >= 2
              ? ((lastClose - firstClose) / firstClose) * 100
              : s.changePercent;
            const isUp = twChangePct >= 0;

            return (
              <div key={s.symbol} className="card flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--bg-surface)', color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                  {s.name.slice(0, 2)}
                </div>

                {/* Name + symbol */}
                <Link href={marketDetailHref(s.symbol)} className="flex-1 min-w-0" style={{ textDecoration: 'none' }}>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{s.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.symbol}</span>
                    <span className="badge-amber" style={{ fontSize: 9, padding: '1px 4px' }}>{s.exchange}</span>
                  </div>
                </Link>

                {/* Sparkline */}
                <MiniSparkline data={spark} width={52} height={26} positive={isUp} />

                {/* Price + 2w change */}
                <div className="text-right shrink-0 w-24">
                  <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                    {s.price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end gap-0.5">
                    {isUp
                      ? <ArrowUpRight size={11} style={{ color: 'var(--gain)' }} />
                      : <ArrowDownRight size={11} style={{ color: 'var(--loss)' }} />}
                    <span className="text-xs font-mono font-bold" style={{ color: isUp ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {Math.abs(twChangePct).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>2주</p>
                </div>

                {/* Remove */}
                <WatchlistButton symbol={s.symbol} size="sm" onChange={(watching) => handleWatchChange(s.symbol, watching)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
