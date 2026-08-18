import { createClient, Metadata, type Client } from 'nice-grpc';
import type {
  AdvisoryInvestmentHorizon,
  AdvisoryRecommendationBody,
  AdvisoryRecommendationResult,
  AdvisoryRiskTolerance,
  AdvisoryValidationStatus,
} from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import {
  AdvisoryServiceDefinition,
  InvestmentHorizon,
  RiskTolerance,
  ValidationStatus,
  type Recommendation,
} from './gen/advisory/v1/advisory';

type AdvisoryClient = Client<typeof AdvisoryServiceDefinition>;

let advisoryClient: AdvisoryClient | null = null;

function advisory(): AdvisoryClient {
  return (advisoryClient ??= createClient(AdvisoryServiceDefinition, getChannel(env.grpc.advisoryAddr)));
}

const userMeta = (userId: string): Metadata => Metadata({ 'x-user-id': userId });

function riskToleranceToProto(value: AdvisoryRiskTolerance): RiskTolerance {
  switch (value) {
    case 'conservative':
      return RiskTolerance.RISK_TOLERANCE_CONSERVATIVE;
    case 'moderate':
      return RiskTolerance.RISK_TOLERANCE_MODERATE;
    case 'aggressive':
      return RiskTolerance.RISK_TOLERANCE_AGGRESSIVE;
  }
}

function investmentHorizonToProto(value?: AdvisoryInvestmentHorizon): InvestmentHorizon {
  switch (value) {
    case 'short':
      return InvestmentHorizon.INVESTMENT_HORIZON_SHORT;
    case 'mid':
      return InvestmentHorizon.INVESTMENT_HORIZON_MID;
    case 'long':
      return InvestmentHorizon.INVESTMENT_HORIZON_LONG;
    default:
      return InvestmentHorizon.INVESTMENT_HORIZON_UNSPECIFIED;
  }
}

function validationStatusToShared(value: ValidationStatus): AdvisoryValidationStatus {
  switch (value) {
    case ValidationStatus.VALIDATION_STATUS_PASSED:
      return 'passed';
    case ValidationStatus.VALIDATION_STATUS_RETRIED:
      return 'retried';
    case ValidationStatus.VALIDATION_STATUS_FAILED:
      return 'failed';
    default:
      return 'unspecified';
  }
}

function recommendationToShared(item: Recommendation): AdvisoryRecommendationResult['recommendations'][number] {
  return {
    stockCode: item.stockCode,
    nameKr: item.nameKr,
    fitScore: item.fitScore,
    narrative: item.narrative,
    improvementTags: item.improvementTags,
    priceSnapshot: Number(item.priceSnapshot),
  };
}

export async function grpcGetAdvisoryRecommendations(
  userId: string,
  body: AdvisoryRecommendationBody,
): Promise<AdvisoryRecommendationResult> {
  const response = await advisory().getRecommendations(
    {
      riskTolerance: riskToleranceToProto(body.riskTolerance),
      investmentHorizon: investmentHorizonToProto(body.investmentHorizon),
      preferredSectors: body.preferredSectors ?? [],
      freeTextQuery: body.freeTextQuery?.trim() ?? '',
    },
    { metadata: userMeta(userId) },
  );

  return {
    recommendations: response.recommendations.map(recommendationToShared),
    validationStatus: validationStatusToShared(response.validationStatus),
    validationErrors: response.validationErrors,
    retryCount: response.retryCount,
  };
}
