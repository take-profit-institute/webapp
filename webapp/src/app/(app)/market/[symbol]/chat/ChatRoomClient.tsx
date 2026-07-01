'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { getChatRoom, getStock, useApi } from '@/apis';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useAuthStore } from '@/store/useStore';
import type { ChatBroadcast, ChatWireMessage } from '@/lib/api-types';
import { marketDetailHref } from '@/lib/market-routes';

// ─────────────────────────────────────────────────────────────────────────────
// 실시간 채팅: 방 배정(REST /chat/rooms) → WS(/chat/ws) → Redis Pub/Sub 팬아웃.
// 백엔드 봉투는 {accountId, message, ts}뿐이라, 닉/아바타는 클라가 프레임에 동봉한다
// (ChatWireMessage). 본인 메시지도 팬아웃으로 되돌아오므로 송신은 echo 없이 보낸다.
// 설계: docs/CHATTING_SERVICE.md, docs/CHAT_DEPLOYMENT.md
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  kind: 'user' | 'system';
  nickname?: string;
  avatar?: string;
  text: string;
  ts: number;
  mine?: boolean;
}

let seq = 0;
const nextId = () => `m${Date.now()}_${seq++}`;

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoomClient({ symbol }: { symbol: string }) {
  const { data: stock } = useApi(() => getStock(symbol), [symbol]);
  const stockName = stock?.name ?? symbol;

  // 방 배정 — roomId/방번호/배정시점 인원
  const { data: room } = useApi(() => getChatRoom(symbol), [symbol]);
  const roomId = room?.roomId ?? null;
  const roomNo = room?.room ?? 1;
  const memberCount = room?.count ?? 0;

  const myAccountId = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: nextId(), kind: 'system', text: `${symbol} 채팅방에 입장했습니다`, ts: Date.now() },
  ]);
  const [draft, setDraft] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 새 메시지 도착 시 항상 맨 아래로 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // 서버 봉투 수신 → 동봉된 표시정보(ChatWireMessage) 복원 → UI 메시지로 매핑
  const onBroadcast = useCallback(
    (b: ChatBroadcast) => {
      let inner: ChatWireMessage | null = null;
      try {
        inner = JSON.parse(b.message) as ChatWireMessage;
      } catch {
        return; // 프로토콜 외 프레임 무시
      }
      if (!inner || typeof inner.text !== 'string') return;
      setMessages((prev) => [
        ...prev.slice(-200),
        {
          id: nextId(),
          kind: 'user',
          nickname: inner.nick,
          avatar: inner.avatar,
          text: inner.text,
          ts: b.ts,
          mine: !!myAccountId && b.accountId === myAccountId,
        },
      ]);
    },
    [myAccountId],
  );

  const { send: sendSocket, status } = useChatSocket(roomId, onBroadcast);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    // 송신만 — 본인 메시지는 팬아웃으로 되돌아와 렌더된다(중복 방지).
    if (sendSocket(text)) setDraft('');
  };

  const grouped = useMemo(() => messages, [messages]);

  const connected = status === 'open';

  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] lg:h-[100dvh]">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-3 md:px-5 py-3 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Link
          href={marketDetailHref(symbol)}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base md:text-lg font-black truncate" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              {stockName}
            </h1>
            <span className="badge-amber shrink-0">{roomNo}번방</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{symbol}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'animate-pulse' : ''}`}
            style={{ background: connected ? 'var(--gain)' : 'var(--text-muted)' }}
          />
          <Users size={14} />
          <span className="text-sm font-mono" style={{ fontFamily: 'JetBrains Mono' }}>{memberCount}</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 md:px-5 py-4 space-y-3 scrollbar-none">
        {grouped.map((m) =>
          m.kind === 'system' ? (
            <div key={m.id} className="flex justify-center">
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
              >
                {m.text}
              </span>
            </div>
          ) : m.mine ? (
            <div key={m.id} className="flex justify-end items-end gap-1.5">
              <span className="text-[10px] shrink-0 mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                {timeLabel(m.ts)}
              </span>
              <div
                className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-sm break-words"
                style={{ background: 'var(--amber)', color: '#000', fontWeight: 500 }}
              >
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                {m.avatar}
              </div>
              <div className="min-w-0">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.nickname}</span>
                <div className="flex items-end gap-1.5">
                  <div
                    className="max-w-[75%] px-3 py-2 rounded-2xl rounded-tl-sm text-sm break-words"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] shrink-0 mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {timeLabel(m.ts)}
                  </span>
                </div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 md:px-5 py-3 shrink-0 pb-safe"
        style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={connected ? '메시지를 입력하세요' : '연결 중…'}
          maxLength={300}
          className="input-dark flex-1"
          aria-label="채팅 메시지 입력"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || !connected}
          aria-label="전송"
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all"
          style={{
            background: draft.trim() && connected ? 'var(--amber)' : 'var(--bg-card)',
            color: draft.trim() && connected ? '#000' : 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
