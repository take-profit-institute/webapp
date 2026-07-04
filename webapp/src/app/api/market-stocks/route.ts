import { NextRequest, NextResponse } from 'next/server';

const NAVER_STOCKS_URL = 'https://m.stock.naver.com/api/stocks/marketValue';
const MARKETS = ['KOSPI', 'KOSDAQ'] as const;
type Market = typeof MARKETS[number];

interface NaverStock {
  itemCode: string;
  stockName: string;
  closePriceRaw: string;
  compareToPreviousClosePriceRaw: string;
  fluctuationsRatio: string;
  accumulatedTradingVolumeRaw: string;
  marketValueRaw: string;
  stockExchangeType?: { name?: string };
}

interface NaverStockPage {
  stocks?: NaverStock[];
  totalCount?: number;
}

export async function GET(request: NextRequest) {
  const marketParam = request.nextUrl.searchParams.get('market');
  const markets: Market[] = marketParam === 'KOSPI' || marketParam === 'KOSDAQ' ? [marketParam] : [...MARKETS];
  const page = Math.max(0, Number(request.nextUrl.searchParams.get('page')) || 0);
  const size = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('size')) || 20));

  try {
    const responses = await Promise.all(markets.map((market) => fetch(
      `${NAVER_STOCKS_URL}/${market}?page=${page + 1}&pageSize=${size}`,
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    )));
    if (responses.some((response) => !response.ok)) {
      return NextResponse.json({ message: '종목 제공처 응답 오류' }, { status: 502 });
    }

    const payloads = await Promise.all(responses.map((response) => response.json() as Promise<NaverStockPage>));
    const stocks = payloads
      .flatMap((payload) => payload.stocks ?? [])
      .map((stock) => ({
        code: stock.itemCode,
        name: stock.stockName,
        market: stock.stockExchangeType?.name ?? '',
        price: Number(stock.closePriceRaw),
        change: Number(stock.compareToPreviousClosePriceRaw),
        changePercent: Number(stock.fluctuationsRatio),
        volume: Number(stock.accumulatedTradingVolumeRaw),
        marketCap: Number(stock.marketValueRaw),
      }))
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, size);
    const totalElements = payloads.reduce((sum, payload) => sum + (payload.totalCount ?? 0), 0);

    return NextResponse.json({
      items: stocks,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / size)),
      page,
      size,
    });
  } catch {
    return NextResponse.json({ message: '종목을 불러오지 못했습니다.' }, { status: 502 });
  }
}
