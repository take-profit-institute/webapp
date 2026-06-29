import OAuthCallbackClient from './CallbackClient';

// `output: export`는 동적 세그먼트([provider])마다 빌드 시 생성할 경로를 알아야 한다.
// 지원하는 provider만 정적 페이지로 미리 생성한다.
export function generateStaticParams() {
  return [{ provider: 'google' }, { provider: 'kakao' }, { provider: 'naver' }];
}

export default function OAuthCallbackPage() {
  return <OAuthCallbackClient />;
}
