/**
 * 인트라데이(당일) 시세 버퍼 정책.
 *
 * 실시간 틱은 종목당 초당 1건 안팎으로 들어온다. 정규장 6.5시간을 원본 그대로 쌓으면
 * 2만 포인트에 육박하고, 매 틱마다 배열을 통째로 복사(`[...prev, tick]`)하면 누적 복사량이
 * 억 단위가 된다. 차트 높이가 220px라 그만한 해상도는 화면에 표현되지도 않는다.
 *
 * 그래서 **시간 버킷으로 접고 상한을 둔다**:
 *  - 같은 버킷의 틱은 마지막 값으로 덮어쓴다(버킷 종가) → 길이가 늘지 않는다.
 *  - 버킷이 넘어갈 때만 push하고, 상한을 넘으면 앞을 버린다.
 *
 * 결과적으로 틱레이트와 무관하게 배열 길이가 상수로 묶이고, 정규장 전체(09:00~15:30)
 * 모양은 그대로 남는다. 채팅이 `slice(-200)`으로 하는 일과 같은 성격의 방어선이다.
 */
import type { IntradayTick } from './api-types';

/** 버킷 크기. 10초 → 정규장 6.5시간이 2,340포인트. */
export const INTRADAY_BUCKET_MS = 10_000;

/**
 * 배열 상한. 정규장 전체(2,340) + 장 시작 전후 여유.
 * 상한에 걸리면 오래된 쪽부터 버리므로 장이 길어져도 메모리는 고정된다.
 */
export const INTRADAY_MAX_POINTS = 2_400;

/** 틱이 속한 버킷 번호. 타임스탬프를 파싱 못 하면 NaN(= 어떤 버킷과도 불일치). */
function bucketOf(timestamp: string): number {
  return Math.floor(Date.parse(timestamp) / INTRADAY_BUCKET_MS);
}

/** 상한을 넘으면 뒤에서부터 `INTRADAY_MAX_POINTS`개만 남긴다. */
function capped(ticks: IntradayTick[]): IntradayTick[] {
  return ticks.length > INTRADAY_MAX_POINTS ? ticks.slice(ticks.length - INTRADAY_MAX_POINTS) : ticks;
}

/**
 * 원본 틱 시계열을 버킷 단위로 접는다. 서버에서 받은 초기 히스토리에 쓴다.
 * 실시간 append와 같은 버킷 정책을 써야 두 구간의 x축 간격이 어긋나지 않는다.
 */
export function bucketIntradaySeries(ticks: IntradayTick[]): IntradayTick[] {
  const out: IntradayTick[] = [];
  let lastBucket = Number.NaN;
  for (const tick of ticks) {
    const bucket = bucketOf(tick.timestamp);
    if (out.length > 0 && bucket === lastBucket) {
      out[out.length - 1] = tick; // 같은 버킷 — 종가로 갱신
    } else {
      out.push(tick);
      lastBucket = bucket;
    }
  }
  return capped(out);
}

/**
 * 실시간 틱 1건을 버퍼에 반영한 **새 배열**을 만든다(React 상태라 불변 갱신).
 *
 * 같은 버킷이면 길이가 그대로이므로 복사 비용은 상한(2,400) 이하로 고정된다.
 * 값이 실제로 바뀌지 않으면 원본을 그대로 돌려줘 불필요한 리렌더를 막는다.
 */
export function appendIntradayTick(prev: IntradayTick[], tick: IntradayTick): IntradayTick[] {
  const last = prev[prev.length - 1];
  if (last && bucketOf(last.timestamp) === bucketOf(tick.timestamp)) {
    if (last.price === tick.price) return prev; // 같은 버킷 + 같은 가격 → 변화 없음
    const next = prev.slice();
    next[next.length - 1] = tick;
    return next;
  }
  return capped([...prev, tick]);
}

/**
 * 실시간 틱을 상태로 반영하는 주기(ms).
 *
 * 틱마다 `setState`하면 리렌더가 틱레이트를 그대로 따라가고, 차트는 그때마다 전체 시리즈를
 * 다시 그린다. 화면상 초당 1회면 충분하므로 그 사이 틱은 ref에 모아뒀다가 한 번에 flush한다.
 * 버킷(10초)보다 짧게 잡아 현재가 꼬리는 즉각 반응하게 둔다.
 */
export const INTRADAY_FLUSH_MS = 1_000;
