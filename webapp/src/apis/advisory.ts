import type {
  AdvisoryRecommendationBody,
  AdvisoryRecommendationResult,
} from '@/lib/api-types';
import { apiClient } from './client';

export function getAdvisoryRecommendations(
  body: AdvisoryRecommendationBody,
): Promise<AdvisoryRecommendationResult> {
  return apiClient.post<AdvisoryRecommendationResult>('/api/advisory/recommendations', body);
}
