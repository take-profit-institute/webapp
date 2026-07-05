'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { sendAdminNotification } from '@/apis/admin';
import { ApiError } from '@/apis/client';
import type { NotificationType } from '@candle/shared';

const types: Array<{ value: NotificationType; label: string }> = [
  { value: 'market_open', label: '장 시작' },
  { value: 'market_close', label: '장 마감' },
  { value: 'surge', label: '급등' },
  { value: 'crash', label: '급락' },
];

export default function NotificationsPage() {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<NotificationType>('market_open');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  function showToast(ok: boolean, text: string) {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  }

  async function submit() {
    if (!userId || !title || !message) {
      showToast(false, '사용자 ID, 제목, 메시지를 입력하세요.');
      return;
    }
    setSending(true);
    try {
      const meta: Record<string, unknown> = {};
      if (symbol) meta.symbol = symbol;
      if (name) meta.name = name;
      const res = await sendAdminNotification({ target: 'user', userId, type, title, message, meta });
      showToast(true, `알림 발송 완료: ${res.notification.id}`);
      setTitle('');
      setMessage('');
    } catch (e) {
      showToast(false, e instanceof ApiError ? e.message : '알림 발송 실패');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>알림 발송</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>notification-service CreateNotification</p>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ background: toast.ok ? 'var(--gain-dim)' : 'var(--loss-dim)', color: toast.ok ? 'var(--gain)' : 'var(--loss)', fontFamily: 'Noto Sans KR' }}>
          {toast.text}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>대상 사용자 UUID</label>
          <input className="input-dark text-sm" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_id" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>유형</label>
            <select className="input-dark text-sm" value={type} onChange={(e) => setType(e.target.value as NotificationType)}>
              {types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>종목 코드 선택</label>
            <input className="input-dark text-sm" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="005930" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>표시명 선택</label>
            <input className="input-dark text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="삼성전자" />
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>제목</label>
          <input className="input-dark text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>메시지</label>
          <textarea className="input-dark text-sm min-h-32" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <button onClick={submit} disabled={sending} className="btn-amber flex items-center gap-2">
          <Send size={14} /> {sending ? '발송 중...' : '알림 발송'}
        </button>
      </div>
    </div>
  );
}
