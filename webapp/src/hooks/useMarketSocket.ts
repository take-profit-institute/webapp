'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { WsClientMessage, WsServerMessage } from '@/lib/api-types';
import { useMarketStore } from '@/store/useMarketStore';
import { API_BASE_URL } from '@/apis';

// 시세 WS는 게이트웨이(8000)를 타지 않는다 — 게이트웨이는 WS 업그레이드 프록시/인증이 안 된다.
// BFF(/ws)에 직결한다(NEXT_PUBLIC_WS_BASE_URL). 미설정 시 API base(게이트웨이)로 폴백하면
// 핸드셰이크에서 401이 나므로 dev/prod 모두 이 값을 설정해야 한다. http→ws / https→wss 자동 변환.
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL ?? API_BASE_URL.replace(/^http/, 'ws');

export function useMarketSocket(symbols: string[], enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef(0);
  const connectRef = useRef<() => void>(() => {});
  // Keep a stable ref to the latest symbols so reconnect picks them up
  const symbolsRef = useRef<string[]>(symbols);
  // 현재 소켓이 서버에 구독 요청해 둔 심볼 집합. 심볼이 바뀔 때 이 집합과 diff 해서
  // 새로 붙은 건 subscribe, 빠진 건 unsubscribe 한다(옛 심볼 구독 누수 방지).
  const subscribedRef = useRef<Set<string>>(new Set());
  const setLiveQuote = useMarketStore((s) => s.setLiveQuote);

  useEffect(() => { symbolsRef.current = symbols; }, [symbols]);

  const clearConnection = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      // 의도적 종료(unmount·비활성·심볼 없음)다. onclose/onerror 재연결 로직을 떼고 닫아야
      // 화면을 나간 뒤 소켓이 되살아나(재구독→백엔드 구독 누수) 좀비로 남지 않는다.
      // 네트워크 끊김에 의한 자동 재연결은 여기를 거치지 않으므로 그대로 동작한다.
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }
    wsRef.current = null;
    retryRef.current = 0;
    subscribedRef.current.clear();
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !enabled || symbolsRef.current.length === 0) return;

    const ws = new WebSocket(`${WS_BASE}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      if (symbolsRef.current.length > 0) {
        const msg: WsClientMessage = { type: 'subscribe', symbols: symbolsRef.current };
        ws.send(JSON.stringify(msg));
      }
      // 새 소켓은 방금 보낸 심볼만 구독한 상태로 시작한다.
      subscribedRef.current = new Set(symbolsRef.current);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as WsServerMessage;
        if (msg.type === 'quote_update') {
          setLiveQuote(msg.data.symbol, msg.data);
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      if (!enabled) return;
      // Exponential backoff: 1 s → 2 s → 4 s … capped at 30 s
      const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
      retryRef.current += 1;
      timerRef.current = setTimeout(() => connectRef.current(), delay);
    };

    ws.onerror = () => ws.close();
  }, [enabled, setLiveQuote]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      clearConnection();
      return;
    }

    connect();
    return () => {
      clearConnection();
    };
  }, [clearConnection, connect, enabled, symbols.length]);

  // 열려 있는 소켓에 심볼 변경을 반영 — 이전 구독과 diff 해서 추가분만 subscribe,
  // 빠진 종목은 unsubscribe 한다(A→B 이동 시 A 가 남아 백엔드 구독이 새는 걸 막는다).
  useEffect(() => {
    if (!enabled) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const next = new Set(symbols);
    const prev = subscribedRef.current;
    const added = symbols.filter((s) => !prev.has(s));
    const removed = [...prev].filter((s) => !next.has(s));

    if (added.length) {
      ws.send(JSON.stringify({ type: 'subscribe', symbols: added } satisfies WsClientMessage));
    }
    if (removed.length) {
      ws.send(JSON.stringify({ type: 'unsubscribe', symbols: removed } satisfies WsClientMessage));
    }
    subscribedRef.current = next;
  }, [enabled, symbols]);

  const subscribe = useCallback((syms: string[]) => {
    if (!enabled) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'subscribe', symbols: syms } satisfies WsClientMessage));
  }, [enabled]);

  const unsubscribe = useCallback((syms: string[]) => {
    if (!enabled) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'unsubscribe', symbols: syms } satisfies WsClientMessage));
  }, [enabled]);

  return { subscribe, unsubscribe };
}
