import 'dotenv/config';

export type DataSource = 'mock' | 'kis';

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  isDev: str('NODE_ENV', 'development') !== 'production',
  port: Number(str('PORT', '4000')),
  host: str('HOST', '0.0.0.0'),
  corsOrigins: str(
    'CORS_ORIGINS',
    'capacitor://localhost,https://localhost,http://localhost,http://localhost:3000',
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  dataSource: str('DATA_SOURCE', 'mock') as DataSource,
  redisUrl: process.env['REDIS_URL'] || '',
  kis: {
    baseUrl: str('KIS_BASE_URL', 'https://openapi.koreainvestment.com:9443'),
    appKey: str('KIS_APP_KEY', ''),
    appSecret: str('KIS_APP_SECRET', ''),
  },
} as const;
