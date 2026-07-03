'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

type IndexCode = 'KOSPI' | 'KOSDAQ';

interface NaverIndexQuote {
  closePrice: string;
  compareToPreviousClosePrice: string;
  fluctuationsRatio: string;
  localTradedAt?: string;
  marketStatus?: string;
}

interface IndexQuote {
  code: IndexCode;
  price: number;
  change: number;
  changePercent: number;
  updatedAt?: string;
}

const INDEX_CODES: IndexCode[] = ['KOSPI', 'KOSDAQ'];
const POLLING_INTERVAL_MS = 30_000;

function toNumber(value: string): number {
  return Number(value.replaceAll(',', ''));
}

function normalizeQuote(code: IndexCode, quote: NaverIndexQuote): IndexQuote {
  const changePercent = toNumber(quote.fluctuationsRatio);
  const unsignedChange = Math.abs(toNumber(quote.compareToPreviousClosePrice));
  return {
    code,
    price: toNumber(quote.closePrice),
    change: changePercent < 0 ? -unsignedChange : unsignedChange,
    changePercent,
    updatedAt: quote.localTradedAt,
  };
}

async function fetchIndices(): Promise<IndexQuote[]> {
  const response = await fetch('/api/market-indices', { cache: 'no-store' });
  if (!response.ok) throw new Error(`지수 조회 실패 (${response.status})`);

  const payload = await response.json() as { datas?: Array<NaverIndexQuote & { itemCode?: string }> };
  return INDEX_CODES.map((code) => {
    const quote = payload.datas?.find((item) => item.itemCode === code);
    if (!quote) throw new Error(`${code} 응답이 비어 있습니다.`);
    return normalizeQuote(code, quote);
  });
}

export default function MarketIndexWidget() {
  const [quotes, setQuotes] = useState<IndexQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const nextQuotes = await fetchIndices();
      setQuotes(nextQuotes);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), POLLING_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [load]);

  return (
    <section className="mb-4" aria-label="코스피 및 코스닥 지수">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>국내 주요 지수</p>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>30초마다 갱신 · 네이버페이 증권</p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {INDEX_CODES.map((code) => <div key={code} className="card h-[82px] animate-pulse bg-elevated" />)}
        </div>
      )}

      {!loading && error && (
        <div className="card flex h-[82px] items-center justify-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>지수를 불러오지 못했습니다.</span>
          <button onClick={() => void load()} className="flex items-center gap-1 text-amber" aria-label="지수 다시 불러오기">
            <RefreshCw size={12} /> 다시 시도
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3">
          {quotes.map((quote) => {
            const isUp = quote.changePercent >= 0;
            return (
              <div key={quote.code} className="card flex items-center justify-between p-3 md:p-4">
                <div>
                  <p className="mb-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{quote.code}</p>
                  <p className="text-lg font-black font-mono md:text-xl" style={{ color: 'var(--text-primary)' }}>
                    {quote.price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`badge-${isUp ? 'gain' : 'loss'} text-xs`}>
                    {quote.changePercent > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </span>
                  <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {quote.change > 0 ? '+' : ''}{quote.change.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
