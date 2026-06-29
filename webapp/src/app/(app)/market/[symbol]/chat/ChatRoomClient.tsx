'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { getStock, useApi } from '@/apis';
import { useAuthStore } from '@/store/useStore';

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: 현재는 UI 전용 mock이다. 실제 WS 연동(chat-gateway + Redis Pub/Sub)은
// docs/chat-architecture.md 설계에 따라 useChatSocket 훅으로 교체될 자리다.
// 메시지 모델/렌더는 그대로 두고 데이터 소스만 갈아끼우면 되도록 구성했다.
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

const FAKE_USERS = [
  { nickname: '불개미킹', avatar: '🔥' },
  { nickname: '존버는승리', avatar: '💎' },
  { nickname: '익절각', avatar: '📈' },
  { nickname: '물타기장인', avatar: '🌊' },
  { nickname: '퀀트왕', avatar: '🤖' },
];

const FAKE_LINES = [
  '오늘 거래량 미쳤네요',
  '이거 지금 들어가도 되나요?',
  '저는 존버 갑니다 ㅋㅋ',
  '단기 조정인 듯',
  '실적 발표 언제죠?',
  '아까 매수한 사람 부럽다',
  '외인 순매수 들어왔대요',
  '차트 이쁘게 빠지네',
  '50만원에 지지 받나',
  '에이 그냥 적금이 낫겠다',
];

let seq = 0;
const nextId = () => `m${Date.now()}_${seq++}`;

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoomClient({ symbol }: { symbol: string }) {
  const { data: stock } = useApi(() => getStock(symbol), [symbol]);
  const stockName = stock?.name ?? symbol;

  const username = useAuthStore((s) => s.username);
  const avatar = useAuthStore((s) => s.avatar);

  // mock 방 메타데이터 (실제로는 방 배정 API가 종목코드_방번호를 내려줌)
  const roomNo = 1;
  const [memberCount, setMemberCount] = useState(342);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: nextId(), kind: 'system', text: `${symbol} 채팅방에 입장했습니다`, ts: Date.now() },
    { id: nextId(), kind: 'user', nickname: '익절각', avatar: '📈', text: '오늘 분위기 좋네요', ts: Date.now() - 60_000 },
    { id: nextId(), kind: 'user', nickname: '존버는승리', avatar: '💎', text: '저점 잡으신 분들 축하드립니다', ts: Date.now() - 30_000 },
  ]);
  const [draft, setDraft] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 새 메시지 도착 시 항상 맨 아래로 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // mock: 주기적으로 다른 유저 메시지 수신 + 인원수 가볍게 출렁임
  useEffect(() => {
    const msgTimer = setInterval(() => {
      const u = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
      const line = FAKE_LINES[Math.floor(Math.random() * FAKE_LINES.length)];
      setMessages((prev) => [
        ...prev.slice(-200),
        { id: nextId(), kind: 'user', nickname: u.nickname, avatar: u.avatar, text: line, ts: Date.now() },
      ]);
    }, 4000);
    const countTimer = setInterval(() => {
      setMemberCount((c) => Math.max(1, c + Math.floor(Math.random() * 7) - 3));
    }, 5000);
    return () => {
      clearInterval(msgTimer);
      clearInterval(countTimer);
    };
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId(), kind: 'user', nickname: username, avatar, text, ts: Date.now(), mine: true },
    ]);
    setDraft('');
  };

  const grouped = useMemo(() => messages, [messages]);

  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] lg:h-[100dvh]">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-3 md:px-5 py-3 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Link
          href={`/market/${symbol}`}
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
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--gain)' }} />
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
          placeholder="메시지를 입력하세요"
          maxLength={300}
          className="input-dark flex-1"
          aria-label="채팅 메시지 입력"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          aria-label="전송"
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all"
          style={{
            background: draft.trim() ? 'var(--amber)' : 'var(--bg-card)',
            color: draft.trim() ? '#000' : 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
