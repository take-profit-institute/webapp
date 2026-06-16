import { stockList } from '@/lib/mock-data';
import StockDetailClient from './StockDetailClient';

// Pre-render every known symbol so the page works in a fully static export (Capacitor).
export function generateStaticParams() {
  return stockList.map((s) => ({ symbol: s.symbol }));
}

// Static export can only serve the symbols generated above.
export const dynamicParams = false;

export default async function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <StockDetailClient symbol={symbol} />;
}
