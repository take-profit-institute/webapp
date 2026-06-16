/**
 * Display formatting helpers.
 *
 * The BFF returns raw numbers (price 71400, volume 12_300_000, marketCap 426e12)
 * and stays display-agnostic — formatting lives here on the frontend.
 */
import type { Currency } from '@/lib/api-types';

/** Trading volume in shares → compact "12.3M" / "890K". */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${Math.round(volume / 1_000)}K`;
  return String(volume);
}

function trimZero(value: string): string {
  return value.replace(/\.0$/, '');
}

/** Market cap → "426조" (KRW) / "2.94T" · "772B" (USD). */
export function formatMarketCap(marketCap: number, currency: Currency): string {
  if (currency === 'KRW') {
    if (marketCap >= 1_000_000_000_000) return `${trimZero((marketCap / 1_000_000_000_000).toFixed(1))}조`;
    return `${Math.round(marketCap / 100_000_000)}억`;
  }
  if (marketCap >= 1_000_000_000_000) return `${(marketCap / 1_000_000_000_000).toFixed(2)}T`;
  if (marketCap >= 1_000_000_000) return `${Math.round(marketCap / 1_000_000_000)}B`;
  return `${Math.round(marketCap / 1_000_000)}M`;
}

/** 원 단위 금액 → "357만" 식 축약 (만원 단위). */
export function formatManwon(amount: number): string {
  return `${Math.round(amount / 10_000).toLocaleString()}만`;
}

const SECTOR_COLORS: Record<string, string> = {
  반도체: '#F5A623',
  IT: '#0ECB81',
  배터리: '#3B82F6',
  기술: '#8B5CF6',
  자동차: '#EC4899',
  바이오: '#14B8A6',
  화학: '#F97316',
  현금: '#3D5068',
};

const FALLBACK_PALETTE = ['#F5A623', '#0ECB81', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#3D5068'];

/** Stable color for a sector legend/donut slice (the API doesn't carry colors). */
export function sectorColor(sector: string, index = 0): string {
  return SECTOR_COLORS[sector] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}
