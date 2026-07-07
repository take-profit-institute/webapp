'use client';

import { useSearchParams } from 'next/navigation';
import { ErrorState } from '@/components/AsyncState';
import LearnDetailClient from './LearnDetailClient';

export default function LearnDetailPageClient() {
  const id = useSearchParams().get('id')?.trim();

  if (!id) {
    return (
      <div className="p-3 md:p-6 max-w-[1400px]">
        <ErrorState error={new Error('학습 콘텐츠 ID가 필요합니다')} />
      </div>
    );
  }

  return <LearnDetailClient id={id} />;
}
