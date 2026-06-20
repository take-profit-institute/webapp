'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile } from '@candle/shared';

interface AdminAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isLoggedIn: boolean;
  setSession: (tokens: { accessToken: string; refreshToken: string }, user: UserProfile) => void;
  clearSession: () => void;
}

export const useAdminStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoggedIn: false,
      setSession: (tokens, user) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user, isLoggedIn: true }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false }),
    }),
    {
      name: 'candle-admin-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
