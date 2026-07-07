const USE_STATIC_MARKET_ROUTES = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

export function marketDetailHref(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  return USE_STATIC_MARKET_ROUTES ? `/market/detail?symbol=${encoded}` : `/market/${encoded}`;
}

export function marketChatHref(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  return USE_STATIC_MARKET_ROUTES ? `/market/chat?symbol=${encoded}` : `/market/${encoded}/chat`;
}

// 학습 상세는 정적 export 호환을 위해 쿼리파라미터 페이지(/learn/detail)로 통일.
// (동적 세그먼트 /learn/[id]는 빌드시 경로 열거가 불가해 제거)
export function learnDetailHref(id: string) {
  return `/learn/detail?id=${encodeURIComponent(id)}`;
}
