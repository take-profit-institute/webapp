import { NextResponse } from 'next/server';

const INDEX_CODES = ['KOSPI', 'KOSDAQ'] as const;
const NAVER_INDEX_URL = 'https://polling.finance.naver.com/api/realtime/domestic/index';

export async function GET() {
  try {
    const responses = await Promise.all(
      INDEX_CODES.map((code) => fetch(`${NAVER_INDEX_URL}/${code}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })),
    );

    if (responses.some((response) => !response.ok)) {
      return NextResponse.json({ message: '지수 제공처 응답 오류' }, { status: 502 });
    }

    const payloads = await Promise.all(responses.map((response) => response.json()));
    return NextResponse.json({
      datas: payloads.flatMap((payload) => payload.datas ?? []),
    });
  } catch {
    return NextResponse.json({ message: '지수를 불러오지 못했습니다.' }, { status: 502 });
  }
}
