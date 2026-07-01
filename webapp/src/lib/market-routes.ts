const USE_STATIC_MARKET_ROUTES = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

export function marketDetailHref(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  return USE_STATIC_MARKET_ROUTES ? `/market/detail?symbol=${encoded}` : `/market/${encoded}`;
}

export function marketChatHref(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  return USE_STATIC_MARKET_ROUTES ? `/market/chat?symbol=${encoded}` : `/market/${encoded}/chat`;
}
