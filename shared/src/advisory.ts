import { Type, type Static } from '@sinclair/typebox';

export const AdvisoryRiskTolerance = Type.Union([
  Type.Literal('conservative'),
  Type.Literal('moderate'),
  Type.Literal('aggressive'),
]);
export type AdvisoryRiskTolerance = Static<typeof AdvisoryRiskTolerance>;

export const AdvisoryInvestmentHorizon = Type.Union([
  Type.Literal('short'),
  Type.Literal('mid'),
  Type.Literal('long'),
]);
export type AdvisoryInvestmentHorizon = Static<typeof AdvisoryInvestmentHorizon>;

export const AdvisoryValidationStatus = Type.Union([
  Type.Literal('unspecified'),
  Type.Literal('passed'),
  Type.Literal('retried'),
  Type.Literal('failed'),
]);
export type AdvisoryValidationStatus = Static<typeof AdvisoryValidationStatus>;

export const AdvisoryRecommendationBody = Type.Object({
  riskTolerance: AdvisoryRiskTolerance,
  investmentHorizon: Type.Optional(AdvisoryInvestmentHorizon),
  preferredSectors: Type.Optional(
    Type.Array(Type.String({ minLength: 1, maxLength: 50 }), { maxItems: 10 }),
  ),
  freeTextQuery: Type.Optional(Type.String({ maxLength: 500 })),
});
export type AdvisoryRecommendationBody = Static<typeof AdvisoryRecommendationBody>;

export const AdvisoryRecommendation = Type.Object({
  stockCode: Type.String(),
  nameKr: Type.String(),
  fitScore: Type.Number({ minimum: 0, maximum: 1 }),
  narrative: Type.String(),
  improvementTags: Type.Array(Type.String()),
  priceSnapshot: Type.Number(),
});
export type AdvisoryRecommendation = Static<typeof AdvisoryRecommendation>;

export const AdvisoryRecommendationResult = Type.Object({
  recommendations: Type.Array(AdvisoryRecommendation),
  validationStatus: AdvisoryValidationStatus,
  validationErrors: Type.Array(Type.String()),
  retryCount: Type.Number(),
});
export type AdvisoryRecommendationResult = Static<typeof AdvisoryRecommendationResult>;
