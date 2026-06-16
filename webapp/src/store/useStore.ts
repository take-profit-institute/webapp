'use client';
import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  username: string;
  avatar: string;
  cash: number;
  totalAsset: number;
  returnPercent: number;
  rank: number;
  login: (username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  username: '박유빈',
  avatar: '🐯',
  cash: 2125780,
  totalAsset: 118360000,
  returnPercent: 18.36,
  rank: 4,
  login: (username) => set({ isLoggedIn: true, username }),
  logout: () => set({ isLoggedIn: false }),
}));

type Theme = 'dark' | 'light';

const THEME_KEY = 'candle-theme';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  theme: 'dark',
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
