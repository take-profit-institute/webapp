'use client';
import { create } from 'zustand';

interface WatchlistState {
  symbols: Set<string>;
  initialized: boolean;
  setSymbols: (symbols: string[]) => void;
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  isWatching: (symbol: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  symbols: new Set(),
  initialized: false,

  setSymbols: (symbols) =>
    set({ symbols: new Set(symbols), initialized: true }),

  add: (symbol) =>
    set((s) => ({ symbols: new Set([...s.symbols, symbol]) })),

  remove: (symbol) =>
    set((s) => {
      const next = new Set(s.symbols);
      next.delete(symbol);
      return { symbols: next };
    }),

  isWatching: (symbol) => get().symbols.has(symbol),
}));
