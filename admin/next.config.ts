import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@candle/shared'],
  output: 'standalone',
};

export default nextConfig;
