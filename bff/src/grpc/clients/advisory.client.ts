/**
 * AdvisoryService gRPC client stub.
 * Owns: investment profile based stock recommendations.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export type AdvisoryRiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type AdvisoryInvestmentHorizon = 'short' | 'mid' | 'long';

export interface AdvisoryRecommendationRequest {
  userId: string;
  riskTolerance: AdvisoryRiskTolerance;
  investmentHorizon?: AdvisoryInvestmentHorizon;
  preferredSectors?: string[];
  freeTextQuery?: string;
}

export interface AdvisoryRecommendation {
  stockCode: string;
  nameKr: string;
  fitScore: number;
  narrative: string;
  improvementTags: string[];
  priceSnapshot: number;
}

export interface AdvisoryRecommendationResponse {
  recommendations: AdvisoryRecommendation[];
  validationStatus: 'unspecified' | 'passed' | 'retried' | 'failed';
  validationErrors: string[];
  retryCount: number;
}

export interface AdvisoryServiceClient {
  getRecommendations(
    req: AdvisoryRecommendationRequest,
    opts?: GrpcCallOptions,
  ): Promise<AdvisoryRecommendationResponse>;
}

class StubAdvisoryServiceClient implements AdvisoryServiceClient {
  getRecommendations(): Promise<AdvisoryRecommendationResponse> {
    return notImplemented('AdvisoryService', 'getRecommendations');
  }
}

export function createAdvisoryServiceClient(_channel: GrpcChannel): AdvisoryServiceClient {
  return new StubAdvisoryServiceClient();
}
