import type { Challenge, LearnContent } from '@candle/shared';
import type { Mission, MissionStatus } from '@candle/shared';
import type { RankingEntry } from '@candle/shared';

export const rankings: RankingEntry[] = [
  { rank: 1, userId: 'u1', username: '황금손투자왕', avatar: '👑', returnPercent: 34.82, totalAsset: 134820000, dayChangePercent: 2.1, badge: '전설' },
  { rank: 2, userId: 'u2', username: '불개미킹', avatar: '🔥', returnPercent: 28.54, totalAsset: 128540000, dayChangePercent: -0.8, badge: '마스터' },
  { rank: 3, userId: 'u3', username: 'StockWhiz99', avatar: '⚡', returnPercent: 22.17, totalAsset: 122170000, dayChangePercent: 1.4, badge: '마스터' },
  { rank: 4, userId: 'u_demo', username: '박유빈', avatar: '🐯', returnPercent: 18.36, totalAsset: 118360000, dayChangePercent: 0.6 },
  { rank: 5, userId: 'u5', username: '주식의신', avatar: '💎', returnPercent: 15.92, totalAsset: 115920000, dayChangePercent: -1.2 },
  { rank: 6, userId: 'u6', username: '개미투자자', avatar: '🌱', returnPercent: 12.48, totalAsset: 112480000, dayChangePercent: 0.3 },
  { rank: 7, userId: 'u7', username: 'TradeMaster', avatar: '📈', returnPercent: 9.74, totalAsset: 109740000, dayChangePercent: 2.8 },
  { rank: 8, userId: 'u8', username: '시장분석가', avatar: '🔭', returnPercent: 7.23, totalAsset: 107230000, dayChangePercent: -0.5 },
  { rank: 9, userId: 'u9', username: '퀀트왕', avatar: '🤖', returnPercent: 5.88, totalAsset: 105880000, dayChangePercent: 0.9 },
  { rank: 10, userId: 'u10', username: '장기투자자', avatar: '🏔', returnPercent: 4.12, totalAsset: 104120000, dayChangePercent: 0.1 },
];

const now = '2026-06-18T09:00:00+09:00';
const todayEnd = '2026-06-18T23:59:59+09:00';
const weekEnd = '2026-06-21T23:59:59+09:00';

function mission(input: Omit<Mission, 'completed'>): Mission {
  const completed = input.status === 'completed' || input.progress >= input.total;
  return { ...input, completed, status: completed ? 'completed' : input.status };
}

export const missions: Mission[] = [
  mission({ id: 'm1', category: 'daily', title: '오늘의 첫 거래', description: '오늘 첫 번째 주식 매수를 완료하세요', reward: 500, progress: 1, total: 1, status: 'completed', joined: true, claimed: false, badgeReward: '첫 거래', startedAt: now, joinedAt: now, endsAt: todayEnd, icon: '🎯' }),
  mission({ id: 'm2', category: 'daily', title: '시장 동향 파악', description: '주식 상세 페이지 3개 이상 방문', reward: 300, progress: 2, total: 3, status: 'in_progress', joined: true, claimed: false, startedAt: now, joinedAt: now, endsAt: todayEnd, icon: '👁️' }),
  mission({ id: 'm3', category: 'daily', title: '학습 콘텐츠 읽기', description: '투자 학습 아티클 1개 완독', reward: 200, progress: 0, total: 1, status: 'available', joined: false, claimed: false, endsAt: todayEnd, icon: '📚' }),
  mission({ id: 'm4', category: 'weekly', title: '포트폴리오 다각화', description: '서로 다른 섹터 5개에 투자', reward: 2000, progress: 3, total: 5, status: 'in_progress', joined: true, claimed: false, achievementReward: '분산투자 입문', startedAt: now, joinedAt: now, endsAt: weekEnd, icon: '🌐' }),
  mission({ id: 'm5', category: 'weekly', title: '수익 실현', description: '수익률 5% 이상인 종목 매도', reward: 1500, progress: 0, total: 1, status: 'available', joined: false, claimed: false, endsAt: weekEnd, icon: '💰' }),
  mission({ id: 'm6', category: 'weekly', title: '7일 연속 로그인', description: '일주일 동안 매일 접속', reward: 3000, progress: 4, total: 7, status: 'failed', joined: true, claimed: false, endsAt: '2026-06-17T23:59:59+09:00', icon: '🔥' }),
  mission({ id: 'm7', category: 'special', title: '첫 해외 주식 투자', description: '미국 주식을 처음으로 매수', reward: 5000, progress: 1, total: 1, status: 'completed', joined: true, claimed: true, badgeReward: '글로벌 투자자', achievementReward: '해외시장 첫발', startedAt: now, joinedAt: now, endsAt: '2026-12-31T23:59:59+09:00', icon: '🌏' }),
  mission({ id: 'm8', category: 'special', title: '수익률 TOP 10 진입', description: '전체 랭킹 10위 안에 진입', reward: 10000, progress: 1, total: 1, status: 'completed', joined: true, claimed: false, badgeReward: 'TOP 10', achievementReward: '랭킹 입성', startedAt: now, joinedAt: now, endsAt: '2026-12-31T23:59:59+09:00', icon: '🏆' }),
];

export const challenges: Challenge[] = [
  { id: 'c1', title: '6월 수익률 챌린지', description: '시즌 종료일까지 가장 높은 수익률에 도전하세요', season: '2026-06', startsAt: '2026-06-01T00:00:00+09:00', endsAt: '2026-06-30T23:59:59+09:00', status: 'active', joined: true, participants: 428, myRank: 24, reward: 15000, badgeReward: '6월 챌린저' },
  { id: 'c2', title: '방어형 포트폴리오 챌린지', description: '낮은 변동성으로 안정적인 수익률을 만들어보세요', season: '2026-Q3', startsAt: '2026-07-01T00:00:00+09:00', endsAt: '2026-09-30T23:59:59+09:00', status: 'upcoming', joined: false, participants: 72, reward: 20000, badgeReward: '리스크 매니저' },
  { id: 'c3', title: '5월 성장주 챌린지', description: '성장주 중심 포트폴리오 시즌 결과', season: '2026-05', startsAt: '2026-05-01T00:00:00+09:00', endsAt: '2026-05-31T23:59:59+09:00', status: 'completed', joined: true, participants: 390, myRank: 18, reward: 12000, badgeReward: '성장주 탐험가' },
];

export function missionProgressStatus() {
  return {
    total: missions.length,
    available: missions.filter((m) => m.status === 'available').length,
    inProgress: missions.filter((m) => m.status === 'in_progress').length,
    completed: missions.filter((m) => m.status === 'completed').length,
    failed: missions.filter((m) => m.status === 'failed').length,
    cancelled: missions.filter((m) => m.status === 'cancelled').length,
    claimableRewards: missions.filter((m) => m.status === 'completed' && !m.claimed).reduce((sum, m) => sum + m.reward, 0),
    badges: missions.filter((m) => m.claimed && m.badgeReward).map((m) => m.badgeReward!),
    achievements: missions.filter((m) => m.claimed && m.achievementReward).map((m) => m.achievementReward!),
  };
}

export function refreshMissionStatus(m: Mission): Mission {
  const deadlinePassed = Date.parse(m.endsAt) < Date.parse(now);
  if (m.status !== 'completed' && m.status !== 'cancelled' && deadlinePassed) m.status = 'failed';
  if (m.progress >= m.total && m.status !== 'cancelled') {
    m.progress = m.total;
    m.status = 'completed';
    m.completed = true;
  } else {
    m.completed = m.status === 'completed';
  }
  return m;
}

const body = (topic: string) => `${topic}은 투자 판단의 기준을 세우기 위한 핵심 개념입니다.

첫째, 단일 지표만 보고 매수하거나 매도하지 말고 가격, 거래량, 기업 실적, 시장 상황을 함께 확인해야 합니다. 둘째, 같은 지표라도 업종과 시장 국면에 따라 의미가 달라질 수 있으므로 비교 기준을 명확히 잡아야 합니다.

실전에서는 관심 종목을 고른 뒤 투자 가설을 적고, 가설이 틀렸을 때 손실을 제한할 기준을 미리 정하는 방식이 좋습니다. 학습한 개념은 모의투자에서 작은 금액으로 반복 적용하면서 본인만의 판단 과정을 검증해보세요.`;

export const learnContents: LearnContent[] = [
  { id: 'l1', title: '캔들스틱 차트 읽는 법', description: '양봉과 음봉의 의미, 패턴 해석 방법을 배워보세요', category: '기술적분석', level: 'beginner', duration: '5분', readCount: 12840, emoji: '🕯️', keywords: ['캔들', '차트', '양봉', '음봉'], body: body('캔들스틱 차트'), published: true, completed: true, favorite: true, completedAt: '2026-06-15T10:20:00+09:00' },
  { id: 'l2', title: 'PER, PBR로 주식 가치 평가하기', description: '기업의 적정 주가를 계산하는 핵심 지표', category: '기본적분석', level: 'beginner', duration: '8분', readCount: 9230, emoji: '📊', keywords: ['PER', 'PBR', '가치평가', '밸류에이션'], body: body('PER과 PBR'), published: true, completed: false, favorite: true },
  { id: 'l3', title: '분산투자의 중요성', description: '리스크를 줄이는 포트폴리오 구성 전략', category: '투자전략', level: 'beginner', duration: '6분', readCount: 8150, emoji: '🌈', keywords: ['분산투자', '포트폴리오', '리스크'], body: body('분산투자'), published: true, completed: true, favorite: false, completedAt: '2026-06-16T19:10:00+09:00' },
  { id: 'l4', title: '이동평균선 활용 전략', description: '단기/장기 이평선 크로스오버 매매 기법', category: '기술적분석', level: 'intermediate', duration: '12분', readCount: 6840, emoji: '📈', keywords: ['이동평균선', '골든크로스', '데드크로스'], body: body('이동평균선'), published: true, completed: false, favorite: false },
  { id: 'l5', title: 'RSI 지표로 과매수/과매도 판단', description: '상대강도지수를 활용한 매매 타이밍 포착', category: '기술적분석', level: 'intermediate', duration: '10분', readCount: 5920, emoji: '⚡', keywords: ['RSI', '과매수', '과매도', '모멘텀'], body: body('RSI 지표'), published: true, completed: false, favorite: false },
  { id: 'l6', title: '섹터 로테이션 투자 전략', description: '경기 사이클에 맞는 업종 선택 방법', category: '투자전략', level: 'intermediate', duration: '15분', readCount: 4310, emoji: '🔄', keywords: ['섹터', '로테이션', '경기순환'], body: body('섹터 로테이션'), published: true, completed: false, favorite: true },
  { id: 'l7', title: '공매도 이해하기', description: '하락장에서도 수익을 낼 수 있는 공매도 메커니즘', category: '고급전략', level: 'advanced', duration: '20분', readCount: 3210, emoji: '🎭', keywords: ['공매도', '대차', '숏'], body: body('공매도'), published: true, completed: false, favorite: false },
  { id: 'l8', title: '옵션 거래 기초', description: '콜옵션과 풋옵션의 개념과 활용법', category: '고급전략', level: 'advanced', duration: '25분', readCount: 2840, emoji: '🎲', keywords: ['옵션', '콜옵션', '풋옵션', '파생상품'], body: body('옵션 거래'), published: true, completed: false, favorite: false },
  { id: 'l9', title: '재무제표 읽는 법', description: '손익계산서, 대차대조표, 현금흐름표 완전 정복', category: '기본적분석', level: 'intermediate', duration: '18분', readCount: 7650, emoji: '📋', keywords: ['재무제표', '손익계산서', '현금흐름표'], body: body('재무제표'), published: true, completed: false, favorite: false },
];

export function learnProgress() {
  const published = learnContents.filter((c) => c.published);
  const completed = published.filter((c) => c.completed);
  const categories = [...new Set(published.map((c) => c.category))];
  return {
    total: published.length,
    completed: completed.length,
    percent: published.length ? Math.round((completed.length / published.length) * 100) : 0,
    byCategory: categories.map((category) => {
      const items = published.filter((c) => c.category === category);
      const done = items.filter((c) => c.completed).length;
      return { category, total: items.length, completed: done, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
    }),
  };
}

/** Sum of rewards for all completed missions (the user's claimable point pool). */
export function computeTotalPoints(): number {
  return missions.filter((m) => m.claimed).reduce((sum, m) => sum + m.reward, 0);
}
