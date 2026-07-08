'use client';
import { create } from 'zustand';
export { useWatchlistStore } from './useWatchlistStore';
export { useNotificationStore } from './useNotificationStore';
import { persist, createJSONStorage } from 'zustand/middleware';
import { refreshToken as apiRefreshToken, setAuthTokenGetter, setTokenRefresher } from '@/apis';
import { secureTokenStore } from '@/lib/secure-token-store';
import type { OAuthLoginResult, UserProfile, UserRole } from '@/lib/api-types';

interface AuthState {
  // ── session (persisted) ──
  accessToken: string | null;
  refreshToken: string | null;
  /** Access token expiry (epoch ms), for proactive refresh / display. */
  expiresAt: number | null;
  user: UserProfile | null;
  isLoggedIn: boolean;
  /** True right after an OAuth auto-signup (AUTH-002). */
  isNewUser: boolean;
  // ── display compatibility (read by Sidebar) ──
  username: string;
  avatar: string;
  cash: number;
  rank: number;
  // ── actions ──
  setSession: (result: OAuthLoginResult) => void;
  /** 로그인 이후 잔고(availableAmount)/랭킹을 별도로 갱신 (setSession과 분리). */
  setAccountSummary: (input: { cash: number; rank: number }) => void;
  setAccessToken: (token: string, expiresInSec: number) => void;
  clearSession: () => void;
  hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      isLoggedIn: false,
      isNewUser: false,
      username: '박유빈',
      avatar: '🐯',
      cash: 2125780,
      rank: 4,

      setSession: (result) => {
        // refresh_token 은 네이티브 보안 저장소(Keystore/Keychain)에만 보관한다.
        void secureTokenStore.setRefreshToken(result.tokens.refreshToken);
        set({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: Date.now() + result.tokens.expiresIn * 1000,
          user: result.user,
          isLoggedIn: true,
          isNewUser: result.isNewUser,
          username: result.user.username,
          avatar: result.user.avatar,
        });
      },

      setAccountSummary: (input) => set({ cash: input.cash, rank: input.rank }),

      setAccessToken: (token, expiresInSec) =>
        set({ accessToken: token, expiresAt: Date.now() + expiresInSec * 1000 }),

      clearSession: () => {
        void secureTokenStore.clear();
        set({ accessToken: null, refreshToken: null, expiresAt: null, user: null, isLoggedIn: false, isNewUser: false });
      },

      hasRole: (role) => get().user?.role === role,
    }),
    {
      name: 'candle-auth',
      storage: createJSONStorage(() => localStorage),
      // refresh_token 은 localStorage 에 남기지 않는다 — 보안 저장소로만 관리.
      // access_token/user 는 즉시 부팅을 위해 그대로 persist (만료 시 401 재시도가 갱신).
      partialize: (s) => ({
        accessToken: s.accessToken,
        expiresAt: s.expiresAt,
        user: s.user,
        isLoggedIn: s.isLoggedIn,
        isNewUser: s.isNewUser,
        username: s.username,
        avatar: s.avatar,
        cash: s.cash,
        rank: s.rank,
      }),
      // 구버전: refresh_token 이 localStorage(candle-auth)에 있던 사용자 → 보안 저장소로 1회 이관.
      onRehydrateStorage: () => (state) => {
        const legacy = state?.refreshToken;
        if (legacy) {
          void secureTokenStore.setRefreshToken(legacy);
          state!.refreshToken = null;
        }
      },
    },
  ),
);

// ── Wire the token into the API client (Authorization header + 401 refresh) ──
setAuthTokenGetter(() => useAuthStore.getState().accessToken);
setTokenRefresher(async () => {
  // refresh_token 의 단일 소스는 보안 저장소다.
  const rt = await secureTokenStore.getRefreshToken();
  if (!rt) return null;
  try {
    const res = await apiRefreshToken(rt);
    useAuthStore.getState().setAccessToken(res.accessToken, res.expiresIn);
    // 서버가 refresh 를 회전(rotate)시키므로 새 refresh 를 다시 저장한다.
    if (res.refreshToken) await secureTokenStore.setRefreshToken(res.refreshToken);
    return res.accessToken;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
});

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