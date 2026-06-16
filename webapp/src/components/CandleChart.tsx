'use client';
import { useState } from 'react';
import type { Candle } from '@/lib/mock-data';

interface Props {
  data: Candle[];
  width?: number;
  height?: number;
}

const PERIODS = ['1주', '1달', '3달', '6달', '1년'];

export default function CandleChart({ data, width = 600, height = 280 }: Props) {
  const [period, setPeriod] = useState('1달');
  const [hovered, setHovered] = useState<number | null>(null);

  const periodMap: Record<string, number> = { '1주': 5, '1달': 22, '3달': 66, '6달': 132, '1년': 252 };
  const count = periodMap[period] ?? 22;
  const visible = data.slice(-count);

  const pad = { top: 20, right: 16, bottom: 36, left: 64 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  if (!visible.length) return null;

  const prices = visible.flatMap(d => [d.high, d.low]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const sy = (p: number) => pad.top + ch - ((p - minP) / range) * ch;
  const candleW = Math.max(2, cw / visible.length * 0.65);
  const sx = (i: number) => pad.left + (i + 0.5) * (cw / visible.length);

  const priceLabels = Array.from({ length: 5 }, (_, i) => {
    const p = minP + (range / 4) * i;
    return { y: sy(p), label: p >= 10000 ? `${(p / 10000).toFixed(1)}만` : p.toFixed(0) };
  });

  const hoveredCandle = hovered !== null ? visible[hovered] : null;

  return (
    <div className="w-full">
      {/* Period selector */}
      <div className="flex gap-1 mb-3">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              period === p
                ? 'bg-[var(--amber)] text-black'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Hovered info */}
      {hoveredCandle && (
        <div className="flex gap-4 mb-2 text-xs font-mono text-[var(--text-secondary)]">
          <span>{hoveredCandle.date}</span>
          <span>시가 <span className="text-[var(--text-primary)]">{hoveredCandle.open.toLocaleString()}</span></span>
          <span>고가 <span className="text-[var(--gain)]">{hoveredCandle.high.toLocaleString()}</span></span>
          <span>저가 <span className="text-[var(--loss)]">{hoveredCandle.low.toLocaleString()}</span></span>
          <span>종가 <span className="text-[var(--text-primary)]">{hoveredCandle.close.toLocaleString()}</span></span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {priceLabels.map(({ y, label }, i) => (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + cw} y2={y} stroke="var(--border-subtle)" strokeWidth={0.5} strokeDasharray="4 4" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10} fontFamily="JetBrains Mono, monospace">{label}</text>
          </g>
        ))}

        {/* Date labels */}
        {visible.filter((_, i) => i % Math.max(1, Math.floor(visible.length / 6)) === 0).map((c, idx) => {
          const i = visible.indexOf(c);
          return (
            <text key={idx} x={sx(i)} y={height - 6} textAnchor="middle" fill="var(--text-muted)" fontSize={9} fontFamily="JetBrains Mono, monospace">
              {c.date.slice(5)}
            </text>
          );
        })}

        {/* Candles */}
        {visible.map((c, i) => {
          const x = sx(i);
          const isGain = c.close >= c.open;
          const color = isGain ? '#0ECB81' : '#F6465D';
          const bodyTop = sy(Math.max(c.open, c.close));
          const bodyBottom = sy(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBottom - bodyTop);
          const isHov = hovered === i;

          return (
            <g key={i} onMouseEnter={() => setHovered(i)}>
              {isHov && (
                <rect x={x - cw / visible.length / 2} y={pad.top} width={cw / visible.length} height={ch} fill="white" opacity={0.03} />
              )}
              {/* Wick */}
              <line x1={x} y1={sy(c.high)} x2={x} y2={sy(c.low)} stroke={color} strokeWidth={isHov ? 1.5 : 1} />
              {/* Body */}
              <rect
                x={x - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={isGain ? color : color}
                fillOpacity={isHov ? 1 : 0.9}
                rx={candleW > 4 ? 1 : 0}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
