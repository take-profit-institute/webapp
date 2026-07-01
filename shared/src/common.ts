import { Type, type Static, type TSchema } from '@sinclair/typebox';

/** Standard error envelope returned by the BFF (matches Fastify's default error shape). */
export const ErrorResponse = Type.Object({
  statusCode: Type.Number(),
  error: Type.String(),
  code: Type.Optional(Type.String()),
  message: Type.String(),
  traceId: Type.Optional(Type.String()),
});
export type ErrorResponse = Static<typeof ErrorResponse>;

/** Common pagination query params. */
export const PageQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1, description: '페이지 번호 (1-based)' })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20, description: '페이지당 항목 수' })),
});
export type PageQuery = Static<typeof PageQuery>;

/** Paginated response wrapper. Use Paginated(ItemSchema) to create a typed schema. */
export function Paginated(itemSchema: TSchema) {
  return Type.Object({
    items: Type.Array(itemSchema),
    total: Type.Number({ description: '전체 항목 수' }),
    page: Type.Number({ description: '현재 페이지 (1-based)' }),
    limit: Type.Number({ description: '페이지당 항목 수' }),
    totalPages: Type.Number({ description: '전체 페이지 수' }),
  });
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const Exchange = Type.Union(
  [Type.Literal('KOSPI'), Type.Literal('KOSDAQ'), Type.Literal('NYSE'), Type.Literal('NASDAQ')],
);
export type Exchange = Static<typeof Exchange>;

export const Currency = Type.Union([Type.Literal('KRW'), Type.Literal('USD')]);
export type Currency = Static<typeof Currency>;
