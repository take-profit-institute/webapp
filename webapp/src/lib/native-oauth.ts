'use client';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

// ─────────────────────────────────────────────────────────────────────────────
// 네이티브(Capacitor) OAuth 분기.
//
// 웹은 WebView 안에서 redirect로 끝내지만, 모바일은 두 가지 이유로 흐름이 다르다:
//   1) 구글은 임베디드 WebView에서 OAuth 동의를 차단(disallowed_useragent)한다
//      → 시스템 브라우저(Custom Tabs / ASWebAuthenticationSession)로 열어야 한다.
//   2) 앱 WebView origin은 http://localhost 라 웹 콜백 URL로 돌아올 수 없다
//      → 딥링크(커스텀 스킴)로 앱에 복귀한다.
//
// ⚠️ 백엔드 의존: authorizationUrl의 redirect_uri를 아래 네이티브 딥링크로 교체해서 열고,
//    토큰 교환(oauthExchange)에도 같은 redirectUri를 넘긴다. auth-service가 교환 시
//    이 redirectUri를 사용하도록 바뀌기 전까지는 provider가 redirect_uri_mismatch로 거부한다.
//    (provider 콘솔에 이 딥링크/앱링크 등록도 필요)
// ─────────────────────────────────────────────────────────────────────────────

/** 딥링크 콜백 URI. provider 콘솔 등록값과 일치해야 한다. appId(com.candle.app) 기반 커스텀 스킴. */
export const NATIVE_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OAUTH_NATIVE_REDIRECT_URI ?? 'com.candle.app://auth/callback';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export interface NativeOAuthResult {
  code: string | null;
  state: string | null;
  /** provider 에러 코드, 또는 사용자가 브라우저를 닫으면 'cancelled' */
  error: string | null;
}

/** 콜백 스킴 매칭용 prefix(쿼리 제외). */
const CALLBACK_PREFIX = NATIVE_OAUTH_REDIRECT_URI.split('?')[0];

/**
 * 시스템 브라우저로 OAuth 동의를 열고, 딥링크 콜백에서 {code,state}를 받아 반환한다.
 * authorizationUrl의 redirect_uri는 네이티브 딥링크로 강제 교체한다(백엔드 기본값은 웹용).
 */
export async function runNativeOAuth(authorizationUrl: string): Promise<NativeOAuthResult> {
  const url = new URL(authorizationUrl);
  url.searchParams.set('redirect_uri', NATIVE_OAUTH_REDIRECT_URI);

  return new Promise<NativeOAuthResult>((resolve, reject) => {
    let settled = false;
    let urlListener: PluginListenerHandle | undefined;
    let finishedListener: PluginListenerHandle | undefined;

    const cleanup = () => {
      settled = true;
      urlListener?.remove();
      finishedListener?.remove();
    };

    Promise.all([
      // 딥링크 복귀 — 우리 콜백 스킴만 처리
      App.addListener('appUrlOpen', (event) => {
        if (settled || !event.url.startsWith(CALLBACK_PREFIX)) return;
        cleanup();
        void Browser.close().catch(() => {});
        const cb = new URL(event.url);
        resolve({
          code: cb.searchParams.get('code'),
          state: cb.searchParams.get('state'),
          error: cb.searchParams.get('error'),
        });
      }),
      // 사용자가 콜백 없이 브라우저를 닫음 → 취소
      Browser.addListener('browserFinished', () => {
        if (settled) return;
        cleanup();
        resolve({ code: null, state: null, error: 'cancelled' });
      }),
    ])
      .then(([u, f]) => {
        urlListener = u;
        finishedListener = f;
        if (settled) {
          u.remove();
          f.remove();
          return;
        }
        return Browser.open({ url: url.toString() });
      })
      .catch((e) => {
        cleanup();
        reject(e);
      });
  });
}
