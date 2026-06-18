import { Type, type Static } from '@sinclair/typebox';

// ── Server → Client ────────────────────────────────────────────────

export const WsQuoteUpdateData = Type.Object({
  symbol: Type.String(),
  price: Type.Number(),
  change: Type.Number(),
  changePercent: Type.Number(),
  volume: Type.Number(),
  timestamp: Type.String({ format: 'date-time' }),
});
export type WsQuoteUpdateData = Static<typeof WsQuoteUpdateData>;

export const WsQuoteUpdate = Type.Object({
  type: Type.Literal('quote_update'),
  data: WsQuoteUpdateData,
});
export type WsQuoteUpdate = Static<typeof WsQuoteUpdate>;

// Stub for future alert notification routing (targeted by userId, not symbol subscription)
export const WsAlertFired = Type.Object({
  type: Type.Literal('alert_fired'),
  data: Type.Object({
    alertId: Type.String(),
    symbol: Type.String(),
    condition: Type.String(),
    triggeredAt: Type.String({ format: 'date-time' }),
  }),
});
export type WsAlertFired = Static<typeof WsAlertFired>;

export const WsConnected = Type.Object({
  type: Type.Literal('connected'),
  data: Type.Object({ sessionId: Type.String() }),
});
export type WsConnected = Static<typeof WsConnected>;

export const WsServerMessage = Type.Union([WsQuoteUpdate, WsAlertFired, WsConnected]);
export type WsServerMessage = Static<typeof WsServerMessage>;

// ── Client → Server ────────────────────────────────────────────────

export const WsSubscribe = Type.Object({
  type: Type.Literal('subscribe'),
  symbols: Type.Array(Type.String()),
});
export type WsSubscribe = Static<typeof WsSubscribe>;

export const WsUnsubscribe = Type.Object({
  type: Type.Literal('unsubscribe'),
  symbols: Type.Array(Type.String()),
});
export type WsUnsubscribe = Static<typeof WsUnsubscribe>;

export const WsClientMessage = Type.Union([WsSubscribe, WsUnsubscribe]);
export type WsClientMessage = Static<typeof WsClientMessage>;
