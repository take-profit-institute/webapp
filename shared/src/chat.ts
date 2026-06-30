import { Type, type Static } from '@sinclair/typebox';

// ── 방 배정 (REST: GET /chat/rooms?symbol=) ──────────────────────────
// chatting-service의 RoomAssignment 레코드와 1:1.
export const RoomAssignment = Type.Object({
  symbol: Type.String(),
  room: Type.Number(),
  /** `{symbol}_{room}` — WS 쿼리 `?room=` 값 */
  roomId: Type.String(),
  /** Redis Pub/Sub 채널(모니터링 참고용) */
  channel: Type.String(),
  /** 배정 시점 인원(낙관적, 대략치) */
  count: Type.Number(),
});
export type RoomAssignment = Static<typeof RoomAssignment>;

// ── 클라 → 서버 WS 프레임 ────────────────────────────────────────────
// 백엔드(chat-gateway)는 이 프레임을 "불투명 텍스트"로 보고 봉투에 그대로 실어 릴레이한다.
// 닉/아바타는 클라가 동봉(표시정보). accountId/ts는 서버가 stamp한다.
export const ChatWireMessage = Type.Object({
  v: Type.Literal(1),
  nick: Type.String(),
  avatar: Type.String(),
  text: Type.String(),
});
export type ChatWireMessage = Static<typeof ChatWireMessage>;

// ── 서버 → 클라 봉투 (chatting-service의 ChatMessage 레코드) ──────────
// message = 위 ChatWireMessage의 JSON 문자열(이중 봉투). accountId/ts는 서버 stamp(신뢰).
export const ChatBroadcast = Type.Object({
  accountId: Type.String(),
  message: Type.String(),
  ts: Type.Number(),
});
export type ChatBroadcast = Static<typeof ChatBroadcast>;
