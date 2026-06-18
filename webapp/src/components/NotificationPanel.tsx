'use client';
import { useEffect, useRef } from 'react';
import { X, Trash2, TrendingUp, TrendingDown, Bell, Check } from 'lucide-react';
import { useApi, getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/apis';
import { useNotificationStore } from '@/store/useStore';
import type { Notification, NotificationType } from '@/lib/api-types';

function typeIcon(type: NotificationType) {
  if (type === 'surge') return <TrendingUp size={14} style={{ color: 'var(--gain)' }} />;
  if (type === 'crash') return <TrendingDown size={14} style={{ color: 'var(--loss)' }} />;
  return <Bell size={14} style={{ color: 'var(--amber)' }} />;
}

function typeColor(type: NotificationType) {
  if (type === 'surge') return 'var(--gain-dim)';
  if (type === 'crash') return 'var(--loss-dim)';
  return 'var(--amber-subtle)';
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function NotificationPanel() {
  const { panelOpen, closePanel, setUnreadCount, resetCount } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, loading, refetch } = useApi(() => getNotifications({ limit: 30 }), [panelOpen]);
  const notifs: Notification[] = data ?? [];

  // close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closePanel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen, closePanel]);

  if (!panelOpen) return null;

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    refetch();
    setUnreadCount(notifs.filter((n) => n.status === 'UNREAD' && n.id !== id).length);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    refetch();
    const remaining = notifs.filter((n) => n.id !== id);
    setUnreadCount(remaining.filter((n) => n.status === 'UNREAD').length);
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    refetch();
    resetCount();
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed z-50 flex flex-col"
        style={{
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(360px, 100vw)',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>알림</h2>
            {notifs.some((n) => n.status === 'UNREAD') && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>
                읽지 않은 알림 {notifs.filter((n) => n.status === 'UNREAD').length}개
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifs.some((n) => n.status === 'UNREAD') && (
              <button
                onClick={handleReadAll}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}
              >
                <Check size={11} />
                전체 읽음
              </button>
            )}
            <button onClick={closePanel} className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-normal)', borderTopColor: 'var(--amber)' }} />
            </div>
          )}

          {!loading && notifs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bell size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Noto Sans KR' }}>알림이 없습니다</p>
            </div>
          )}

          {!loading && notifs.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 px-4 py-3 transition-colors"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: n.status === 'UNREAD' ? 'var(--bg-card)' : 'transparent',
              }}
            >
              {/* Type icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: typeColor(n.type) }}>
                {typeIcon(n.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Noto Sans KR' }}>{n.name}</span>
                  {n.status === 'UNREAD' && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--amber)' }} />
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'Noto Sans KR' }}>{n.message}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{relativeTime(n.triggeredAt)}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                {n.status === 'UNREAD' && (
                  <button onClick={() => handleRead(n.id)}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    title="읽음 처리">
                    <Check size={11} />
                  </button>
                )}
                <button onClick={() => handleDelete(n.id)}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors active:opacity-60"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  title="삭제">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
