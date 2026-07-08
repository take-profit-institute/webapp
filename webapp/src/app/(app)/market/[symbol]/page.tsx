import { MARKET_SYMBOLS } from '@/apis/market';
import { isValidStockCode } from '@/lib/market-routes';
import StockDetailClient from './StockDetailClient';

// Pre-render every known symbol so the page works in a fully static export (Capacitor).
export function generateStaticParams() {
  return MARKET_SYMBOLS.map((symbol) => ({ symbol }));
}

export default async function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  // 6자리 숫자가 아닌 종목코드(접미사 붙은 코드 등)는 상세 진입을 막는다.
  // (server component이므로 client인 ErrorState 대신 정적 마크업으로 표시)
  if (!isValidStockCode(symbol)) {
    return (
      <div className="p-3 md:p-6 max-w-[1400px]">
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="text-3xl">⚠️</div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>
            유효하지 않은 종목입니다
          </p>
          <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
            종목코드 {symbol}는 조회할 수 없습니다.
          </p>
        </div>
      </div>
    );
  }
  return <StockDetailClient symbol={symbol} />;
}
