'use client';
import { useMemo, useState } from 'react';
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

export default function IntradayChart({ ticks, currency, height = 220 }: Props) {
  // 호버 중인 데이터 포인트 인덱스 — 정확히 그 지점의 가격에 가로 크로스헤어를 맞춘다.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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

  const hoveredPrice = activeIndex !== null ? data[activeIndex]?.price ?? null : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        onMouseMove={(s) => {
          const idx = s?.isTooltipActive ? Number(s.activeTooltipIndex) : NaN;
          setActiveIndex(Number.isInteger(idx) ? idx : null);
        }}
        onMouseLeave={() => setActiveIndex(null)}
      >
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
        {/* 호버 지점의 가격에 정확히 맞춘 가로 크로스헤어 */}
        {hoveredPrice !== null && (
          <ReferenceLine
            y={hoveredPrice}
            stroke="var(--amber)"
            strokeDasharray="3 3"
            strokeWidth={0.8}
            ifOverflow="extendDomain"
          />
        )}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'var(--amber)', strokeWidth: 1, strokeDasharray: '3 3' }}
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
