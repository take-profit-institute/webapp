/** Social/gamification endpoints: rankings, missions, learning content. */
import type {
  ClaimRewardResult,
  LearnContent,
  LearnFavoriteResult,
  LearnLevel,
  LearnProgressResult,
  LearnProgressSummary,
  Mission,
  MissionCategory,
  RankingEntry,
} from '@/lib/api-types';
import { apiClient } from './client';

export const LEARN_CONTENT_IDS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9'];

/** 투자 랭킹. */
export function getRankings(): Promise<RankingEntry[]> {
  return apiClient.get<RankingEntry[]>('/api/rankings');
}

/** 내 랭킹. */
export function getMyRanking(): Promise<RankingEntry> {
  return apiClient.get<RankingEntry>('/api/rankings/me');
}

/** 미션/챌린지 목록. */
export function getMissions(params: { category?: MissionCategory } = {}): Promise<Mission[]> {
  return apiClient.get<Mission[]>('/api/missions', { ...params });
}

/** 학습 콘텐츠 목록. */
export function getLearnContents(
  params: { level?: LearnLevel; category?: string; q?: string; favorite?: boolean } = {},
): Promise<LearnContent[]> {
  return apiClient.get<LearnContent[]>('/api/learn', { ...params });
}

/** 내 학습 진도율. */
export function getLearnProgress(): Promise<LearnProgressSummary> {
  return apiClient.get<LearnProgressSummary>('/api/learn/progress');
}

/** 즐겨찾기 학습 콘텐츠. */
export function getFavoriteLearnContents(): Promise<LearnContent[]> {
  return apiClient.get<LearnContent[]>('/api/learn/favorites');
}

/** 추천 학습 콘텐츠. */
export function getRecommendedLearnContents(): Promise<LearnContent[]> {
  return apiClient.get<LearnContent[]>('/api/learn/recommended');
}

/** 학습 콘텐츠 상세. */
export function getLearnContent(id: string): Promise<LearnContent> {
  return apiClient.get<LearnContent>(`/api/learn/${encodeURIComponent(id)}`);
}

/** 미션 보상 수령. */
export function claimMission(id: string): Promise<ClaimRewardResult> {
  return apiClient.post<ClaimRewardResult>(`/api/missions/${encodeURIComponent(id)}/claim`);
}

/** 미션 진행도 갱신. */
export function progressMission(id: string, amount?: number): Promise<Mission> {
  return apiClient.post<Mission>(`/api/missions/${encodeURIComponent(id)}/progress`, { amount });
}

/** 학습 콘텐츠 완독 처리. */
export function completeLearn(id: string): Promise<LearnProgressResult> {
  return apiClient.post<LearnProgressResult>(`/api/learn/${encodeURIComponent(id)}/complete`);
}

/** 학습 콘텐츠 즐겨찾기 토글. */
export function toggleLearnFavorite(id: string): Promise<LearnFavoriteResult> {
  return apiClient.post<LearnFavoriteResult>(`/api/learn/${encodeURIComponent(id)}/favorite`);
}
