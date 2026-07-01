'use client';

import { useSearchParams } from 'next/navigation';
import { ErrorState } from '@/components/AsyncState';
import StockDetailClient from '../[symbol]/StockDetailClient';

export default function MarketDetailPageClient() {
  const symbol = useSearchParams().get('symbol')?.trim();

  if (!symbol) {
    return (
      <div className="p-3 md:p-6 max-w-[1400px]">
        <ErrorState error={new Error('종목 코드가 필요합니다')} />
      </div>
    );
  }

  return <StockDetailClient symbol={symbol} />;
}
