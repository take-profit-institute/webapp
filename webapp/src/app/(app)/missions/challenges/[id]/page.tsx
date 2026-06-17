import { CHALLENGE_IDS } from '@/apis';
import ChallengeDetailClient from './ChallengeDetailClient';

export function generateStaticParams() {
  return CHALLENGE_IDS.map((id) => ({ id }));
}

export const dynamicParams = false;

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeDetailClient id={id} />;
}
