'use client';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export default function MiniSparkline({ data, width = 80, height = 32, positive }: Props) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const isUp = positive !== undefined ? positive : data[data.length - 1] >= data[0];
  const color = isUp ? '#0ECB81' : '#F6465D';

  const firstX = pad;
  const firstY = pad + h - ((data[0] - min) / range) * h;
  const lastX = pad + w;
  const lastY = pad + h - ((data[data.length - 1] - min) / range) * h;

  const fillPath = `M ${firstX},${firstY} ${points.slice(1).map(p => `L ${p}`).join(' ')} L ${lastX},${height} L ${firstX},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`grad-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#grad-${isUp ? 'up' : 'down'})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
