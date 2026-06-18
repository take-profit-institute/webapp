'use client';
import { create } from 'zustand';
import type { WsQuoteUpdateData } from '@/lib/api-types';

interface MarketState {
  liveQuotes: Record<string, WsQuoteUpdateData>;
  setLiveQuote: (symbol: string, data: WsQuoteUpdateData) => void;
  clearLiveQuotes: () => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  liveQuotes: {},
  setLiveQuote: (symbol, data) =>
    set((state) => ({ liveQuotes: { ...state.liveQuotes, [symbol]: data } })),
  clearLiveQuotes: () => set({ liveQuotes: {} }),
}));
