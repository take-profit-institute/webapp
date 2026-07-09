'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatBroadcast, ChatWireMessage, PresenceEvent } from '@/lib/api-types';
import { API_BASE_URL } from '@/apis';
import { refreshSession, useAuthStore } from '@/store/useStore';

// 채팅 WS 베이스. 시세 WS(BFF /ws)와 서버가 다르므로 별도 env.
// dev=chatting-service 직결(ws://localhost:8090), prod=wss://<도메인>(ALB가 /chat/ws 라우팅).
const CHAT_WS_BASE =
  process.env.NEXT_PUBLIC_CHAT_WS_BASE_URL ?? API_BASE_URL.replace(/^http/, 'ws');

export type ChatStatus = 'connecting' | 'open' | 'closed';

/** 핸드셰이크 인증 실패(서버가 보내는 비표준 close code). chatting-service와 합의된 값. */
const CLOSE_UNAUTHORIZED = 4401;

/**
 * 토큰 갱신 후 재연결용. HTTP 401 흐름(client.ts)과 동일한 공유 refresher 를 쓴다.
 * 공유 single-flight 라 HTTP·프로액티브 refresh 와 겹쳐도 refresh 요청은 한 번만 나가고,
 * refresh_token 도 보안 저장소(secureTokenStore)라는 단일 소스에서 읽는다.
 */
async function refreshAccessToken(): Promise<boolean> {
  return (await refreshSession()) != null;
}

/**
 * 종목 채팅 WS. roomId가 정해진 뒤 호출한다.
 *
 * - 토큰은 연결 시점에 매번 store에서 재조회(갱신 반영). 쿼리스트링으로 전달.
 * - 재연결은 같은 roomId 고정(방 튕김 방지) + 지수 백오프(1s→…→30s).
 * - 4401(인증 실패)이면 토큰 1회 리프레시 후 즉시 재시도.
 * - 본인 메시지도 Redis 팬아웃으로 되돌아오므로, 송신은 echo 없이 보내고 수신 시 렌더(mine 판별).
 */
export function useChatSocket(
  roomId: string | null,
  onBroadcast: (msg: ChatBroadcast) => void,
  onPresence?: (event: PresenceEvent) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef(0);
  const refreshedRef = useRef(false);
  const onRef = useRef(onBroadcast);
  const onPresenceRef = useRef(onPresence);
  // 최신 connect를 ref로 들고 재연결에서 호출한다(자기참조 회피).
  const connectRef = useRef<() => void>(() => {});
  // 상태 전이는 WS 콜백/지연 재연결(비동기)에서만 한다(effect 내 동기 setState 회피).
  const [status, setStatus] = useState<ChatStatus>(() =>
    typeof window !== 'undefined' && useAuthStore.getState().accessToken ? 'connecting' : 'closed',
  );

  useEffect(() => {
    onRef.current = onBroadcast;
    onPresenceRef.current = onPresence;
  }, [onBroadcast, onPresence]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !roomId) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const scheduleReconnect = () => {
      const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
      retryRef.current += 1;
      timerRef.current = setTimeout(() => connectRef.current(), delay);
    };

    setStatus('connecting');
    const url = `${CHAT_WS_BASE}/chat/ws?room=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      refreshedRef.current = false;
      setStatus('open');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ChatBroadcast | PresenceEvent;
        // presence 이벤트(입/퇴장): type 판별자로 채팅 봉투와 구분해 인원수 콜백으로 라우팅.
        if ('type' in msg && msg.type === 'presence' && typeof msg.count === 'number') {
          onPresenceRef.current?.(msg);
          return;
        }
        if (typeof (msg as ChatBroadcast).accountId === 'string' && typeof (msg as ChatBroadcast).message === 'string') {
          onRef.current(msg as ChatBroadcast);
        }
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = (e) => {
      setStatus('closed');
      if (e.code === CLOSE_UNAUTHORIZED && !refreshedRef.current) {
        refreshedRef.current = true;
        void refreshAccessToken().then((ok) => {
          if (ok) connectRef.current();
          else scheduleReconnect();
        });
        return;
      }
      scheduleReconnect();
    };

    ws.onerror = () => ws.close();
  }, [roomId]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    // WebSocket 구독(외부 시스템 동기화) — 상태 전이는 WS 콜백/지연 재연결(비동기)에서만 일어나
    // effect 내 동기 setState는 없다. 정적 분석기가 도달성만으로 보수적으로 잡는 false positive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  /** 메시지 전송. 표시정보(nick/avatar)를 동봉한다. 연결이 안 열렸으면 false. */
  const send = useCallback((text: string): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const { username, avatar } = useAuthStore.getState();
    const frame: ChatWireMessage = { v: 1, nick: username, avatar, text };
    ws.send(JSON.stringify(frame));
    return true;
  }, []);

  return { send, status };
}
