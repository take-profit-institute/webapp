import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@candle/shared'],
  // 정적 SPA(S3+CloudFront)로 서빙한다. app router → out/ 정적 번들.
  output: 'export',
  // 깊은 경로가 route/index.html 로 해석되도록(정적 파일 서버/CloudFront 대응).
  trailingSlash: true,
  // next/image 옵티마이저는 서버가 필요 → 정적 번들에선 원본 그대로.
  images: { unoptimized: true },
};


export default nextConfig;
