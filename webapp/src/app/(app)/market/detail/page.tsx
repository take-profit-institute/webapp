import { Suspense } from 'react';
import { Loader } from '@/components/AsyncState';
import MarketDetailPageClient from './MarketDetailPageClient';

export default function MarketDetailPage() {
  return (
    <Suspense fallback={<Loader />}>
      <MarketDetailPageClient />
    </Suspense>
  );
}
