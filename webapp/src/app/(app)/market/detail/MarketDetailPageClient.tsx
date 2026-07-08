'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ErrorState } from '@/components/AsyncState';
import { isValidStockCode } from '@/lib/market-routes';
import StockDetailClient from '../[symbol]/StockDetailClient';

export default function MarketDetailPageClient() {
  const router = useRouter();
  const symbol = useSearchParams().get('symbol')?.trim();
  // 6자리 숫자가 아닌 종목코드(예: 252670_AL)는 지원하지 않음 — alert 후 이전 화면으로.
  const unsupported = !!symbol && !isValidStockCode(symbol);

  useEffect(() => {
    if (unsupported) {
      alert(`지원하지 않는 종목코드입니다: ${symbol}`);
      router.back();
    }
  }, [unsupported, symbol, router]);

  if (!symbol) {
    return (
      <div className="p-3 md:p-6 max-w-[1400px]">
        <ErrorState error={new Error('종목 코드가 필요합니다')} />
      </div>
    );
  }

  if (unsupported) return null; // alert + 뒤로가기 처리 중이므로 상세를 렌더하지 않음

  return <StockDetailClient symbol={symbol} />;
}
