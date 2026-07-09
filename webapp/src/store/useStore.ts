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

// ── Wire the token into the API client (Authorization header + refresh) ──
setAuthTokenGetter(() => useAuthStore.getState().accessToken);

// 실제 refresh 수행부. refresh_token 의 단일 소스는 보안 저장소다.
async function doRefresh(): Promise<string | null> {
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
}

// single-flight: 동시 401 이나 프로액티브 타이머가 겹쳐도 refresh 는 한 번만 나간다.
// rotation(1회용 refresh) 특성상 병렬 refresh 는 하나 빼고 전부 실패→clearSession 으로
// 이어져 세션이 날아가는데, 진행 중 Promise 를 공유해 그 레이스를 없앤다.
let inflightRefresh: Promise<string | null> | null = null;

export function refreshSession(): Promise<string | null> {
  return (inflightRefresh ??= doRefresh().finally(() => {
    inflightRefresh = null;
  }));
}

setTokenRefresher(refreshSession);

// ── 프로액티브 refresh: 401/403 을 기다리지 않고 access 만료 전에 미리 갱신한다. ──
// 만료 BUFFER 전에 runRefresh() 를 예약. single-flight 라 반응형 401 refresh 와 겹쳐도
// 중복 요청은 안 나간다. 토큰이 갱신될 때마다(expiresAt 변경) 다음 주기를 다시 건다.
const PROACTIVE_REFRESH_BUFFER_MS = 60_000; // 만료 60초 전
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleProactiveRefresh(): void {
  if (typeof window === 'undefined') return;
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  const { expiresAt, accessToken } = useAuthStore.getState();
  if (!accessToken || !expiresAt) return; // 미로그인/로그아웃이면 예약 없음

  // 이미 임박·만료면 즉시(0ms), 아니면 만료 BUFFER 전에.
  const delay = Math.max(0, expiresAt - PROACTIVE_REFRESH_BUFFER_MS - Date.now());
  proactiveTimer = setTimeout(() => void refreshSession(), delay);
}

// 로그인·refresh 성공으로 만료시각이 바뀔 때마다 타이머 재설정.
useAuthStore.subscribe((state, prev) => {
  if (state.expiresAt !== prev.expiresAt) scheduleProactiveRefresh();
});

// 부팅 시(persist 로 복구된 세션 포함) 최초 예약 — 복구된 토큰이 이미 만료됐으면 즉시 갱신.
scheduleProactiveRefresh();

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