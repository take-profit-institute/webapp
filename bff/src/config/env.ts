import 'dotenv/config';

export type DataSource = 'mock' | 'grpc' | 'kis';

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function csv(key: string, fallback: string): string[] {
  return str(key, fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function wildcardOriginToRegExp(origin: string): RegExp | null {
  if (!origin.includes('*')) return null;

  const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+');
  return new RegExp(`^${escaped}$`);
}

const corsOriginEntries = csv(
  'CORS_ORIGINS',
  'capacitor://localhost,https://localhost,http://localhost,http://localhost:3000,http://localhost:3001,https://*.vercel.app,https://*.builderio.dev',
);

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  isDev: str('NODE_ENV', 'development') !== 'production',
  port: Number(str('PORT', '4000')),
  host: str('HOST', '0.0.0.0'),
  corsOrigins: corsOriginEntries.filter((origin) => !origin.includes('*')),
  corsOriginPatterns: corsOriginEntries.flatMap((origin) => {
    const pattern = wildcardOriginToRegExp(origin);
    return pattern ? [pattern] : [];
  }),
  dataSource: str('DATA_SOURCE', 'grpc') as DataSource,
  redisUrl: process.env['REDIS_URL'] || '',
  // auth-service와 공유하는 JWT HMAC 시크릿. admin 라우트 토큰 검증에 사용.
  authJwtSecret: str('AUTH_JWT_HMAC_SECRET', 'change-me-in-production-change-me-in-production'),
  kis: {
    baseUrl: str('KIS_BASE_URL', 'https://openapi.koreainvestment.com:9443'),
    appKey: str('KIS_APP_KEY', ''),
    appSecret: str('KIS_APP_SECRET', ''),
  },
  grpc: {
    authAddr: str('GRPC_AUTH_ADDR', 'localhost:50051'),
    userAddr: str('GRPC_USER_ADDR', 'localhost:50052'),
    marketAddr: str('GRPC_MARKET_ADDR', 'localhost:50063'),
    accountAddr: str('GRPC_ACCOUNT_ADDR', 'localhost:50054'),
    portfolioAddr: str('GRPC_PORTFOLIO_ADDR', 'localhost:50055'),
    rankingAddr: str('GRPC_RANKING_ADDR', 'localhost:50056'),
    notificationAddr: str('GRPC_NOTIFICATION_ADDR', 'localhost:50057'),
    missionAddr: str('GRPC_MISSION_ADDR', 'localhost:50058'),
    learnAddr: str('GRPC_LEARN_ADDR', 'localhost:50059'),
    stockAddr: str('GRPC_STOCK_ADDR', 'localhost:50060'),
    wishlistAddr: str('GRPC_WISHLIST_ADDR', 'localhost:50061'),
    batchAddr: str('GRPC_BATCH_ADDR', 'localhost:50062'),
    newsAddr: str('GRPC_NEWS_ADDR', 'localhost:50064'),
    deadlineMs: Number(str('GRPC_DEADLINE_MS', '5000')),
  },
} as const;
