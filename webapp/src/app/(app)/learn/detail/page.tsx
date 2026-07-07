import { Suspense } from 'react';
import { Loader } from '@/components/AsyncState';
import LearnDetailPageClient from './LearnDetailPageClient';

export default function LearnDetailPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LearnDetailPageClient />
    </Suspense>
  );
}
