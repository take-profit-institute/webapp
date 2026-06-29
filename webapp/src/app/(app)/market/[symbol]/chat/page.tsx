import { MARKET_SYMBOLS } from '@/apis/market';
import ChatRoomClient from './ChatRoomClient';

// 종목 상세와 동일하게, 정적 export를 위해 알려진 종목을 전부 미리 생성한다.
export function generateStaticParams() {
  return MARKET_SYMBOLS.map((symbol) => ({ symbol }));
}

// 정적 export는 위에서 생성한 종목만 서빙한다.
export const dynamicParams = false;

export default async function StockChatPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <ChatRoomClient symbol={symbol} />;
}
