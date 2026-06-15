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

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
