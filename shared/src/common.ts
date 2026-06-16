import { Type, type Static } from '@sinclair/typebox';

/** Standard error envelope returned by the BFF (matches Fastify's default error shape). */
export const ErrorResponse = Type.Object({
  statusCode: Type.Number(),
  error: Type.String(),
  message: Type.String(),
});
export type ErrorResponse = Static<typeof ErrorResponse>;

export const Exchange = Type.Union(
  [Type.Literal('KOSPI'), Type.Literal('KOSDAQ'), Type.Literal('NYSE'), Type.Literal('NASDAQ')],
);
export type Exchange = Static<typeof Exchange>;

export const Currency = Type.Union([Type.Literal('KRW'), Type.Literal('USD')]);
export type Currency = Static<typeof Currency>;
