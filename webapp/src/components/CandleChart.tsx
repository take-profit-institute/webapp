'use client';
import { useState, type PointerEvent } from 'react';
import type { Candle } from '@/lib/api-types';

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
  const step = cw / visible.length;
  const candleW = Math.max(2, step * 0.65);
  const sx = (i: number) => pad.left + (i + 0.5) * step;

  // 크로스헤어가 캔들 사이를 부드럽게 미끄러지도록 하는 전환.
  const CROSSHAIR_TRANSITION = 'transform 90ms cubic-bezier(0.22, 1, 0.36, 1)';

  const priceLabels = Array.from({ length: 5 }, (_, i) => {
    const p = minP + (range / 4) * i;
    return { y: sy(p), label: p >= 10000 ? `${(p / 10000).toFixed(1)}만` : p.toFixed(0) };
  });

  const hoveredCandle = hovered !== null ? visible[hovered] : null;
  const hoveredX = hovered !== null ? sx(hovered) : null;
  const hoveredY = hoveredCandle ? sy(hoveredCandle.close) : null;
  const hoveredPriceLabel = hoveredCandle
    ? hoveredCandle.close >= 10000
      ? `${(hoveredCandle.close / 10000).toFixed(1)}만`
      : hoveredCandle.close.toLocaleString()
    : '';

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const local = point.matrixTransform(ctm.inverse());
    const clampedX = Math.min(Math.max(local.x, pad.left), pad.left + cw);
    const index = Math.min(
      visible.length - 1,
      Math.max(0, Math.floor(((clampedX - pad.left) / cw) * visible.length)),
    );
    setHovered(index);
  };

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

      {/* Hovered info — 항상 자리를 차지해 호버 시 레이아웃이 밀리지 않게 한다 */}
      <div className="flex items-center gap-4 mb-2 h-4 text-xs font-mono text-[var(--text-secondary)]">
        {hoveredCandle && (
          <>
            <span>{hoveredCandle.date}</span>
            <span>시가 <span className="text-[var(--text-primary)]">{hoveredCandle.open.toLocaleString()}</span></span>
            <span>고가 <span className="text-[var(--gain)]">{hoveredCandle.high.toLocaleString()}</span></span>
            <span>저가 <span className="text-[var(--loss)]">{hoveredCandle.low.toLocaleString()}</span></span>
            <span>종가 <span className="text-[var(--text-primary)]">{hoveredCandle.close.toLocaleString()}</span></span>
          </>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        style={{ height }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
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
            <g key={i}>
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

        {hoveredX !== null && hoveredY !== null && hoveredCandle && (
          <g pointerEvents="none">
            {/* 호버 캔들 컬럼 하이라이트 (부드럽게 이동) */}
            <rect
              x={-step / 2}
              y={pad.top}
              width={step}
              height={ch}
              fill="white"
              opacity={0.04}
              style={{ transform: `translateX(${hoveredX}px)`, transition: CROSSHAIR_TRANSITION }}
            />
            {/* 세로 크로스헤어 */}
            <line
              x1={0}
              y1={pad.top}
              x2={0}
              y2={pad.top + ch}
              stroke="var(--amber)"
              strokeWidth={0.8}
              strokeDasharray="3 3"
              opacity={0.7}
              style={{ transform: `translateX(${hoveredX}px)`, transition: CROSSHAIR_TRANSITION }}
            />
            {/* 가로 크로스헤어 */}
            <line
              x1={pad.left}
              y1={0}
              x2={pad.left + cw}
              y2={0}
              stroke="var(--amber)"
              strokeWidth={0.8}
              strokeDasharray="3 3"
              opacity={0.55}
              style={{ transform: `translateY(${hoveredY}px)`, transition: CROSSHAIR_TRANSITION }}
            />
            {/* 데이터 포인트 */}
            <circle
              cx={0}
              cy={0}
              r={3}
              fill="var(--amber)"
              stroke="var(--bg-card)"
              strokeWidth={1.5}
              style={{ transform: `translate(${hoveredX}px, ${hoveredY}px)`, transition: CROSSHAIR_TRANSITION }}
            />
            {/* 가격 라벨 (세로로만 이동, 플롯 안에 클램프) */}
            <g
              style={{
                transform: `translateY(${Math.min(Math.max(hoveredY - 11, pad.top), pad.top + ch - 22)}px)`,
                transition: CROSSHAIR_TRANSITION,
              }}
            >
              <rect
                x={pad.left + cw - 52}
                y={0}
                width={52}
                height={22}
                rx={4}
                fill="var(--bg-card)"
                stroke="var(--amber)"
                strokeWidth={0.8}
              />
              <text
                x={pad.left + cw - 26}
                y={15}
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
              >
                {hoveredPriceLabel}
              </text>
            </g>
          </g>
        )}

        <rect
          x={pad.left}
          y={pad.top}
          width={cw}
          height={ch}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
        />
      </svg>
    </div>
  );
}
