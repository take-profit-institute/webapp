/**
 * Purely visual chart helpers (no data dependency).
 *
 * `generateSparkline` fabricates a deterministic mini-trend from a base price —
 * it's decorative only (the real OHLCV series comes from the BFF candles API).
 */
function seedRandom(seed: number) {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Deterministic sparkline points derived from a base price (decorative). */
export function generateSparkline(basePrice: number, points = 20, seed = 1): number[] {
  const rand = seedRandom(seed);
  const data: number[] = [];
  let price = basePrice * (0.9 + rand() * 0.1);
  for (let i = 0; i < points; i++) {
    price = price + (rand() - 0.47) * price * 0.02;
    data.push(Math.round(price));
  }
  return data;
}

/** Stable numeric seed from a symbol string (so a stock's sparkline doesn't flicker). */
export function symbolSeed(symbol: string): number {
  return parseInt(symbol.replace(/\D/g, ''), 10) || [...symbol].reduce((a, c) => a + c.charCodeAt(0), 0) || 42;
}
