import LearnDetailClient from './LearnDetailClient';

export function generateStaticParams() {
  return [];
}

export default async function LearnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LearnDetailClient id={id} />;
}
