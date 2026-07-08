'use client';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { IntradayTick } from '@/lib/api-types';

interface Props {
  ticks: IntradayTick[];
  currency: string;
  height?: number;
}

interface ChartPoint {
  time: string;
  price: number;
  raw: string; // ISO timestamp for tooltip
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint; name?: string }> }) {
  if (!active || !payload?.length) return null;
  const { price, raw } = payload[0].payload as ChartPoint;
  const d = new Date(raw);
  const full = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-normal)',
      borderRadius: 8,
      padding: '8px 12px',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'Noto Sans KR', marginBottom: 4 }}>{full}</p>
      <p style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
        {price.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{payload[0].name}</span>
      </p>
    </div>
  );
}

/**
 * 활성 데이터 포인트(동그란 activeDot)의 중심에 정확히 스냅되는 2축 크로스헤어.
 * recharts가 커서 엘리먼트에 넘겨주는 값으로 그린다:
 *  - points[0].x  → 활성 포인트의 x (시간축, 이미 데이터 포인트에 스냅됨)
 *  - top/height   → 플롯 영역 세로 범위
 *  - payload[0].value → 활성 포인트의 가격 → 도메인으로 픽셀 y 환산(= activeDot의 cy)
 * activeCoordinate.y 는 (horizontal 레이아웃에선) 마우스 y라 쓰지 않는다.
 */
function CrosshairCursor(props: {
  points?: Array<{ x: number; y: number }>;
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  payload?: Array<{ value?: number }>;
  domainMin?: number;
  domainMax?: number;
}) {
  const { points, top, left, width, height, payload, domainMin, domainMax } = props;
  if (
    !points?.length ||
    top == null || left == null || width == null || height == null ||
    domainMin == null || domainMax == null
  ) {
    return null;
  }
  const x = points[0].x;
  const price = payload?.[0]?.value;
  const span = domainMax - domainMin || 1;
  const py = typeof price === 'number' ? top + height * (1 - (price - domainMin) / span) : null;
  return (
    <g pointerEvents="none">
      <line
        x1={x} y1={top} x2={x} y2={top + height}
        stroke="var(--amber)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.7}
      />
      {py != null && (
        <line
          x1={left} y1={py} x2={left + width} y2={py}
          stroke="var(--amber)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.55}
        />
      )}
    </g>
  );
}

export default function IntradayChart({ ticks, currency, height = 220 }: Props) {
  const data = useMemo<ChartPoint[]>(
    () =>
      ticks.map(({ price, timestamp }) => ({
        time: new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        price,
        raw: timestamp,
      })),
    [ticks],
  );

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2"
        style={{ height, color: 'var(--text-muted)' }}
      >
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--amber)' }} />
        <p className="text-sm" style={{ fontFamily: 'Noto Sans KR' }}>실시간 데이터 수집 중...</p>
      </div>
    );
  }

  const basePrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const isUp = lastPrice >= basePrice;
  const lineColor = isUp ? 'var(--gain)' : 'var(--loss)';

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad = Math.max((maxP - minP) * 0.15, 1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="time" hide />
        <YAxis
          domain={[minP - pad, maxP + pad]}
          tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          width={68}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <ReferenceLine
          y={basePrice}
          stroke="var(--border-normal)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={<CrosshairCursor domainMin={minP - pad} domainMax={maxP + pad} />}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="price"
          name={currency}
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, stroke: 'var(--bg-card)', strokeWidth: 2, fill: lineColor }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
