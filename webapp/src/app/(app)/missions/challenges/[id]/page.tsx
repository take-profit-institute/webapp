import ChallengeDetailClient from './ChallengeDetailClient';

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeDetailClient id={id} />;
}
