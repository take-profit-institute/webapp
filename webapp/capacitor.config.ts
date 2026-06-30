import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.candle.app',
  appName: 'Candle',
  // Next.js static export output — produced by `next build` with output: 'export'.
  webDir: 'out',
  server: {
    androidScheme: 'http',
  },
};

export default config;
