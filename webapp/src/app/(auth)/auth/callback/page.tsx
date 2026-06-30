'use client';
import { useEffect } from 'react';

// OAuth 네이티브 브릿지 페이지.
// provider(Google/Kakao/Naver)는 redirect_uri에 https만 허용하므로, 네이티브 OAuth는
// 이 https 페이지로 돌아온 뒤 커스텀 스킴 딥링크로 앱에 한 번 더 바운스한다.
//   provider → https://<vercel>/auth/callback?code=…&state=… → com.candle.app://auth/callback?…
// 앱의 appUrlOpen 리스너가 그 딥링크를 받아 코드 교환을 수행한다.
// (웹 로그인은 provider별 /auth/[provider]/callback 을 쓰므로 이 페이지를 거치지 않는다)
const DEEP_LINK = process.env.NEXT_PUBLIC_OAUTH_NATIVE_REDIRECT_URI ?? 'com.candle.app://auth/callback';

export default function OAuthBridgePage() {
  useEffect(() => {
    // 받은 code/state 쿼리를 그대로 앱 딥링크로 전달
    window.location.replace(DEEP_LINK + window.location.search);
  }, []);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Noto Sans KR, sans-serif', color: '#888' }}>앱으로 돌아가는 중…</p>
    </div>
  );
}
