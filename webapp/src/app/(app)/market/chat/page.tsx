import { Suspense } from 'react';
import { Loader } from '@/components/AsyncState';
import MarketChatPageClient from './MarketChatPageClient';

export default function MarketChatPage() {
  return (
    <Suspense fallback={<Loader />}>
      <MarketChatPageClient />
    </Suspense>
  );
}
