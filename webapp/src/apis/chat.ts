/** 종목 채팅 방 배정 (`/chat/rooms`). WS 연결은 `hooks/useChatSocket.ts` 참고. */
import type { RoomAssignment } from '@/lib/api-types';
import { CHAT_API_BASE_URL, request } from './client';

/**
 * 종목 입장 → `{ roomId, channel, count }` 배정.
 * chatting-service는 BFF가 아니라 게이트웨이/직결 베이스를 쓰므로 `CHAT_API_BASE_URL`로 보낸다.
 */
export function getChatRoom(symbol: string): Promise<RoomAssignment> {
  return request<RoomAssignment>(
    '/chat/rooms',
    { method: 'GET', query: { symbol } },
    true,
    CHAT_API_BASE_URL,
  );
}
