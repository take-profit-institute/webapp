/**
 * refresh_token 전용 보안 저장소.
 *
 * - 네이티브(Capacitor Android/iOS): Keystore/Keychain 으로 암호화 저장.
 * - 웹(Next dev / Vercel): 네이티브 구현이 없으므로 localStorage 로 폴백.
 *   (웹은 어차피 httpOnly 쿠키 기반이라 이 값이 없어도 동작한다.)
 *
 * refresh_token(30일)만 여기 둔다. access_token(15분)/user 는 zustand persist(localStorage)에
 * 그대로 두어 앱이 즉시 부팅되게 한다 — 만료된 access 는 401 재시도가 이 토큰으로 갱신한다.
 */
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const KEY = 'candle_refresh_token';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export const secureTokenStore = {
  async getRefreshToken(): Promise<string | null> {
    if (isNative()) {
      try {
        const { value } = await SecureStoragePlugin.get({ key: KEY });
        return value || null;
      } catch {
        // 키가 없으면 플러그인이 throw 하므로 null 로 정규화한다.
        return null;
      }
    }
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    if (isNative()) {
      await SecureStoragePlugin.set({ key: KEY, value: token });
      return;
    }
    try {
      localStorage.setItem(KEY, token);
    } catch {
      /* private mode 등 저장 실패는 무시 */
    }
  },

  async clear(): Promise<void> {
    if (isNative()) {
      try {
        await SecureStoragePlugin.remove({ key: KEY });
      } catch {
        /* 이미 없으면 무시 */
      }
      return;
    }
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* 무시 */
    }
  },
};
