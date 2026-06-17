import { LEARN_CONTENT_IDS } from '@/apis';
import LearnDetailClient from './LearnDetailClient';

export function generateStaticParams() {
  return LEARN_CONTENT_IDS.map((id) => ({ id }));
}

export const dynamicParams = false;

export default async function LearnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LearnDetailClient id={id} />;
}
