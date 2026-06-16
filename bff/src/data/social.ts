import type { LearnContent } from '@candle/shared';
import type { Mission } from '@candle/shared';
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
