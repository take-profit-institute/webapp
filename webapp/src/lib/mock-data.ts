export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  sector: string;
  exchange: 'KOSPI' | 'KOSDAQ' | 'NYSE' | 'NASDAQ';
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  sector: string;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  time: string;
}

export interface RankingUser {
  rank: number;
  username: string;
  avatar: string;
  returnPercent: number;
  totalAsset: number;
  change: number;
  badge?: string;
}

export interface Mission {
  id: string;
  category: 'daily' | 'weekly' | 'special';
  title: string;
  description: string;
  reward: number;
  progress: number;
  total: number;
  completed: boolean;
  icon: string;
}

export interface LearnContent {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  readCount: number;
  emoji: string;
}

export const stockList: Stock[] = [
  { symbol: '005930', name: '삼성전자', price: 71400, change: 800, changePercent: 1.13, volume: '12.3M', marketCap: '426조', sector: '반도체', exchange: 'KOSPI' },
  { symbol: '000660', name: 'SK하이닉스', price: 198500, change: -2500, changePercent: -1.24, volume: '3.8M', marketCap: '144조', sector: '반도체', exchange: 'KOSPI' },
  { symbol: '373220', name: 'LG에너지솔루션', price: 312000, change: 4000, changePercent: 1.30, volume: '890K', marketCap: '73조', sector: '배터리', exchange: 'KOSPI' },
  { symbol: '005380', name: '현대차', price: 215500, change: 1500, changePercent: 0.70, volume: '1.2M', marketCap: '46조', sector: '자동차', exchange: 'KOSPI' },
  { symbol: '035420', name: 'NAVER', price: 168000, change: -3000, changePercent: -1.75, volume: '820K', marketCap: '27조', sector: 'IT', exchange: 'KOSPI' },
  { symbol: '035720', name: '카카오', price: 39450, change: 650, changePercent: 1.67, volume: '4.1M', marketCap: '17조', sector: 'IT', exchange: 'KOSPI' },
  { symbol: '068270', name: '셀트리온', price: 182000, change: -1500, changePercent: -0.82, volume: '680K', marketCap: '24조', sector: '바이오', exchange: 'KOSPI' },
  { symbol: '207940', name: '삼성바이오로직스', price: 891000, change: 12000, changePercent: 1.36, volume: '210K', marketCap: '63조', sector: '바이오', exchange: 'KOSPI' },
  { symbol: '006400', name: '삼성SDI', price: 274000, change: -5000, changePercent: -1.79, volume: '480K', marketCap: '18조', sector: '배터리', exchange: 'KOSPI' },
  { symbol: '051910', name: 'LG화학', price: 294000, change: 2500, changePercent: 0.86, volume: '350K', marketCap: '20조', sector: '화학', exchange: 'KOSPI' },
  { symbol: '091990', name: '셀트리온헬스케어', price: 56200, change: 400, changePercent: 0.72, volume: '2.1M', marketCap: '7.6조', sector: '바이오', exchange: 'KOSDAQ' },
  { symbol: '247540', name: '에코프로비엠', price: 128500, change: -3500, changePercent: -2.65, volume: '1.5M', marketCap: '12조', sector: '배터리', exchange: 'KOSDAQ' },
  { symbol: 'AAPL', name: '애플', price: 189840, change: 2340, changePercent: 1.25, volume: '52.3M', marketCap: '2.94T', sector: '기술', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: '테슬라', price: 242680, change: -5120, changePercent: -2.07, volume: '89.1M', marketCap: '772B', sector: '자동차', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: '엔비디아', price: 875200, change: 18400, changePercent: 2.15, volume: '41.8M', marketCap: '2.16T', sector: '반도체', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: '마이크로소프트', price: 415600, change: 3200, changePercent: 0.78, volume: '22.4M', marketCap: '3.09T', sector: '기술', exchange: 'NASDAQ' },
];

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateCandleData(basePrice: number, days = 60, seed = 42): Candle[] {
  const rand = seedRandom(seed);
  const candles: Candle[] = [];
  let price = basePrice * 0.85;
  const now = new Date('2026-06-15');

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const open = price;
    const changeRange = open * 0.025;
    const change = (rand() - 0.47) * changeRange;
    const close = open + change;
    const wickRange = Math.abs(change) * (0.5 + rand() * 1.5);
    const high = Math.max(open, close) + rand() * wickRange;
    const low = Math.min(open, close) - rand() * wickRange;
    const volume = Math.floor(500000 + rand() * 5000000);

    candles.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume,
    });
    price = close;
  }
  return candles;
}

export function generateSparkline(basePrice: number, points = 20, seed = 1): number[] {
  const rand = seedRandom(seed);
  const data: number[] = [];
  let price = basePrice * (0.9 + rand() * 0.1);
  for (let i = 0; i < points; i++) {
    price = price + (rand() - 0.47) * price * 0.02;
    data.push(Math.round(price));
  }
  return data;
}

export const myHoldings: Holding[] = [
  { symbol: '005930', name: '삼성전자', quantity: 50, avgPrice: 68200, currentPrice: 71400, totalValue: 3570000, profitLoss: 160000, profitLossPercent: 4.69, sector: '반도체' },
  { symbol: 'NVDA', name: '엔비디아', quantity: 3, avgPrice: 820000, currentPrice: 875200, totalValue: 2625600, profitLoss: 165600, profitLossPercent: 6.73, sector: '반도체' },
  { symbol: '000660', name: 'SK하이닉스', quantity: 15, avgPrice: 210000, currentPrice: 198500, totalValue: 2977500, profitLoss: -172500, profitLossPercent: -5.48, sector: '반도체' },
  { symbol: 'AAPL', name: '애플', quantity: 8, avgPrice: 182000, currentPrice: 189840, totalValue: 1518720, profitLoss: 62720, profitLossPercent: 4.31, sector: '기술' },
  { symbol: '035420', name: 'NAVER', quantity: 20, avgPrice: 175000, currentPrice: 168000, totalValue: 3360000, profitLoss: -140000, profitLossPercent: -4.00, sector: 'IT' },
  { symbol: '373220', name: 'LG에너지솔루션', quantity: 10, avgPrice: 295000, currentPrice: 312000, totalValue: 3120000, profitLoss: 170000, profitLossPercent: 5.76, sector: '배터리' },
];

export const recentTransactions: Transaction[] = [
  { id: 't1', type: 'buy', symbol: '005930', name: '삼성전자', quantity: 10, price: 71200, total: 712000, date: '2026-06-15', time: '09:32' },
  { id: 't2', type: 'sell', symbol: 'TSLA', name: '테슬라', quantity: 2, price: 248000, total: 496000, date: '2026-06-14', time: '15:48' },
  { id: 't3', type: 'buy', symbol: 'NVDA', name: '엔비디아', quantity: 1, price: 868000, total: 868000, date: '2026-06-13', time: '10:15' },
  { id: 't4', type: 'buy', symbol: '373220', name: 'LG에너지솔루션', quantity: 5, price: 308000, total: 1540000, date: '2026-06-12', time: '11:22' },
  { id: 't5', type: 'sell', symbol: '035420', name: 'NAVER', quantity: 10, price: 172000, total: 1720000, date: '2026-06-11', time: '14:07' },
  { id: 't6', type: 'buy', symbol: 'AAPL', name: '애플', quantity: 3, price: 185000, total: 555000, date: '2026-06-10', time: '09:45' },
];

export const rankings: RankingUser[] = [
  { rank: 1, username: '황금손투자왕', avatar: '👑', returnPercent: 34.82, totalAsset: 134820000, change: 2.1, badge: '전설' },
  { rank: 2, username: '불개미킹', avatar: '🔥', returnPercent: 28.54, totalAsset: 128540000, change: -0.8, badge: '마스터' },
  { rank: 3, username: 'StockWhiz99', avatar: '⚡', returnPercent: 22.17, totalAsset: 122170000, change: 1.4, badge: '마스터' },
  { rank: 4, username: '박유빈', avatar: '🐯', returnPercent: 18.36, totalAsset: 118360000, change: 0.6 },
  { rank: 5, username: '주식의신', avatar: '💎', returnPercent: 15.92, totalAsset: 115920000, change: -1.2 },
  { rank: 6, username: '개미투자자', avatar: '🌱', returnPercent: 12.48, totalAsset: 112480000, change: 0.3 },
  { rank: 7, username: 'TradeMaster', avatar: '📈', returnPercent: 9.74, totalAsset: 109740000, change: 2.8 },
  { rank: 8, username: '시장분석가', avatar: '🔭', returnPercent: 7.23, totalAsset: 107230000, change: -0.5 },
  { rank: 9, username: '퀀트왕', avatar: '🤖', returnPercent: 5.88, totalAsset: 105880000, change: 0.9 },
  { rank: 10, username: '장기투자자', avatar: '🏔', returnPercent: 4.12, totalAsset: 104120000, change: 0.1 },
];

export const missions: Mission[] = [
  { id: 'm1', category: 'daily', title: '오늘의 첫 거래', description: '오늘 첫 번째 주식 매수를 완료하세요', reward: 500, progress: 1, total: 1, completed: true, icon: '🎯' },
  { id: 'm2', category: 'daily', title: '시장 동향 파악', description: '주식 상세 페이지 3개 이상 방문', reward: 300, progress: 2, total: 3, completed: false, icon: '👁️' },
  { id: 'm3', category: 'daily', title: '학습 콘텐츠 읽기', description: '투자 학습 아티클 1개 완독', reward: 200, progress: 0, total: 1, completed: false, icon: '📚' },
  { id: 'm4', category: 'weekly', title: '포트폴리오 다각화', description: '서로 다른 섹터 5개에 투자', reward: 2000, progress: 3, total: 5, completed: false, icon: '🌐' },
  { id: 'm5', category: 'weekly', title: '수익 실현', description: '수익률 5% 이상인 종목 매도', reward: 1500, progress: 0, total: 1, completed: false, icon: '💰' },
  { id: 'm6', category: 'weekly', title: '7일 연속 로그인', description: '일주일 동안 매일 접속', reward: 3000, progress: 4, total: 7, completed: false, icon: '🔥' },
  { id: 'm7', category: 'special', title: '첫 해외 주식 투자', description: '미국 주식을 처음으로 매수', reward: 5000, progress: 1, total: 1, completed: true, icon: '🌏' },
  { id: 'm8', category: 'special', title: '수익률 TOP 10 진입', description: '전체 랭킹 10위 안에 진입', reward: 10000, progress: 1, total: 1, completed: true, icon: '🏆' },
];

export const learnContents: LearnContent[] = [
  { id: 'l1', title: '캔들스틱 차트 읽는 법', description: '양봉과 음봉의 의미, 패턴 해석 방법을 배워보세요', category: '기술적분석', level: 'beginner', duration: '5분', readCount: 12840, emoji: '🕯️' },
  { id: 'l2', title: 'PER, PBR로 주식 가치 평가하기', description: '기업의 적정 주가를 계산하는 핵심 지표', category: '기본적분석', level: 'beginner', duration: '8분', readCount: 9230, emoji: '📊' },
  { id: 'l3', title: '분산투자의 중요성', description: '리스크를 줄이는 포트폴리오 구성 전략', category: '투자전략', level: 'beginner', duration: '6분', readCount: 8150, emoji: '🌈' },
  { id: 'l4', title: '이동평균선 활용 전략', description: '단기/장기 이평선 크로스오버 매매 기법', category: '기술적분석', level: 'intermediate', duration: '12분', readCount: 6840, emoji: '📈' },
  { id: 'l5', title: 'RSI 지표로 과매수/과매도 판단', description: '상대강도지수를 활용한 매매 타이밍 포착', category: '기술적분석', level: 'intermediate', duration: '10분', readCount: 5920, emoji: '⚡' },
  { id: 'l6', title: '섹터 로테이션 투자 전략', description: '경기 사이클에 맞는 업종 선택 방법', category: '투자전략', level: 'intermediate', duration: '15분', readCount: 4310, emoji: '🔄' },
  { id: 'l7', title: '공매도 이해하기', description: '하락장에서도 수익을 낼 수 있는 공매도 메커니즘', category: '고급전략', level: 'advanced', duration: '20분', readCount: 3210, emoji: '🎭' },
  { id: 'l8', title: '옵션 거래 기초', description: '콜옵션과 풋옵션의 개념과 활용법', category: '고급전략', level: 'advanced', duration: '25분', readCount: 2840, emoji: '🎲' },
  { id: 'l9', title: '재무제표 읽는 법', description: '손익계산서, 대차대조표, 현금흐름표 완전 정복', category: '기본적분석', level: 'intermediate', duration: '18분', readCount: 7650, emoji: '📋' },
];

export const portfolioHistory = Array.from({ length: 30 }, (_, i) => {
  const rand = seedRandom(i + 100);
  const base = 100000000;
  const trend = i * 600000;
  const noise = (rand() - 0.45) * 3000000;
  return {
    date: (() => { const d = new Date('2026-05-16'); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0]; })(),
    value: Math.round(base + trend + noise),
  };
});

export const sectorAllocation = [
  { sector: '반도체', percent: 38, value: 6547500, color: '#F5A623' },
  { sector: '기술', value: 1518720, percent: 8.8, color: '#FFB938' },
  { sector: 'IT', value: 3360000, percent: 19.5, color: '#0ECB81' },
  { sector: '배터리', value: 3120000, percent: 18.1, color: '#3B82F6' },
  { sector: '현금', value: 2125780, percent: 12.3, color: '#3D5068' },
];
