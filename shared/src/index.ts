/**
 * @candle/shared — canonical data contracts shared between the BFF and the web app.
 *
 * Each model is a TypeBox schema (runtime validator, used by the BFF for request/response
 * validation and OpenAPI generation) plus a derived TypeScript type of the same name.
 * The frontend imports these as types only (`import type { Quote } from '@candle/shared'`),
 * so the TypeBox runtime is never bundled into the client.
 */
export * from './common';
export * from './market';
export * from './account';
export * from './social';
export * from './user';
