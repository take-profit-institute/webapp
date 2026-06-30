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

/**
 * provider redirect가 닿는 https 브릿지 URL. provider 콘솔 + auth-service allowlist와 동일해야 한다.
 * (Kakao/Naver/Google-web 모두 redirect_uri에 https만 허용 → 커스텀 스킴 직접 등록 불가라 브릿지를 둔다)
 */
export const OAUTH_BRIDGE_REDIRECT_URI =
  process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BRIDGE_URL ?? 'https://webapp-webapp.vercel.app/auth/callback';

/** 브릿지 페이지가 앱으로 바운스하는 커스텀 스킴(AndroidManifest/Info.plist 등록값). 앱이 받는 딥링크. */
export const OAUTH_APP_DEEP_LINK =
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

/** 딥링크 매칭용 prefix(쿼리 제외). */
const DEEP_LINK_PREFIX = OAUTH_APP_DEEP_LINK.split('?')[0];

/**
 * 시스템 브라우저로 OAuth 동의를 열고, 브릿지→딥링크 복귀에서 {code,state}를 받아 반환한다.
 * 인가 redirect_uri는 브릿지(https)로 강제 교체하고(백엔드 기본값은 웹 콜백), 앱은 커스텀 스킴으로 받는다.
 */
export async function runNativeOAuth(authorizationUrl: string): Promise<NativeOAuthResult> {
  const url = new URL(authorizationUrl);
  url.searchParams.set('redirect_uri', OAUTH_BRIDGE_REDIRECT_URI);

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
        if (settled || !event.url.startsWith(DEEP_LINK_PREFIX)) return;
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
