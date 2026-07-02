'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { WsClientMessage, WsServerMessage } from '@/lib/api-types';
import { useMarketStore } from '@/store/useMarketStore';
import { API_BASE_URL } from '@/apis';

// 시세 WS는 게이트웨이(8000)를 타지 않는다 — 게이트웨이는 WS 업그레이드 프록시/인증이 안 된다.
// BFF(/ws)에 직결한다(NEXT_PUBLIC_WS_BASE_URL). 미설정 시 API base(게이트웨이)로 폴백하면
// 핸드셰이크에서 401이 나므로 dev/prod 모두 이 값을 설정해야 한다. http→ws / https→wss 자동 변환.
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL ?? API_BASE_URL.replace(/^http/, 'ws');

export function useMarketSocket(symbols: string[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef = useRef(0);
  // Keep a stable ref to the latest symbols so reconnect picks them up
  const symbolsRef = useRef<string[]>(symbols);
  const setLiveQuote = useMarketStore((s) => s.setLiveQuote);

  useEffect(() => { symbolsRef.current = symbols; }, [symbols]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    const ws = new WebSocket(`${WS_BASE}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      if (symbolsRef.current.length > 0) {
        const msg: WsClientMessage = { type: 'subscribe', symbols: symbolsRef.current };
        ws.send(JSON.stringify(msg));
      }
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
      // Exponential backoff: 1 s → 2 s → 4 s … capped at 30 s
      const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
      retryRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [setLiveQuote]);

  useEffect(() => {
    connect();
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // Sync new symbols to an already-open socket
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || symbols.length === 0) return;
    const msg: WsClientMessage = { type: 'subscribe', symbols };
    ws.send(JSON.stringify(msg));
  }, [symbols]);

  const subscribe = useCallback((syms: string[]) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'subscribe', symbols: syms } satisfies WsClientMessage));
  }, []);

  const unsubscribe = useCallback((syms: string[]) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'unsubscribe', symbols: syms } satisfies WsClientMessage));
  }, []);

  return { subscribe, unsubscribe };
}
