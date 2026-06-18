import type { Notification } from '@candle/shared';

/** In-memory notification store (mock). Mutations affect this array directly. */
export const notifications: Notification[] = [
  {
    id: 'noti-1',
    symbol: '005930',
    name: '삼성전자',
    type: 'surge',
    status: 'UNREAD',
    message: '삼성전자가 시가 대비 +5.3% 급등했습니다',
    meta: { changePercent: 5.3 },
    triggeredAt: '2026-06-18T10:30:00+09:00',
  },
  {
    id: 'noti-2',
    symbol: '000660',
    name: 'SK하이닉스',
    type: 'crash',
    status: 'UNREAD',
    message: 'SK하이닉스가 시가 대비 -5.1% 급락했습니다',
    meta: { changePercent: -5.1 },
    triggeredAt: '2026-06-18T09:48:00+09:00',
  },
  {
    id: 'noti-3',
    symbol: '005930',
    name: '삼성전자',
    type: 'market_open',
    status: 'UNREAD',
    message: '정규장이 시작되었습니다 (09:00 KST)',
    meta: {},
    triggeredAt: '2026-06-18T09:00:00+09:00',
  },
  {
    id: 'noti-4',
    symbol: '035420',
    name: 'NAVER',
    type: 'market_close',
    status: 'READ',
    message: '정규장이 종료되었습니다 (15:30 KST)',
    meta: {},
    triggeredAt: '2026-06-17T15:30:00+09:00',
    readAt: '2026-06-17T16:05:00+09:00',
  },
  {
    id: 'noti-5',
    symbol: '373220',
    name: 'LG에너지솔루션',
    type: 'surge',
    status: 'READ',
    message: 'LG에너지솔루션이 시가 대비 +6.1% 급등했습니다',
    meta: { changePercent: 6.1 },
    triggeredAt: '2026-06-17T11:22:00+09:00',
    readAt: '2026-06-17T12:00:00+09:00',
  },
];

export function getUnreadCount(): number {
  return notifications.filter((n) => n.status === 'UNREAD').length;
}

export function markRead(id: string): Notification | undefined {
  const n = notifications.find((n) => n.id === id);
  if (!n) return undefined;
  n.status = 'READ';
  n.readAt = new Date().toISOString();
  return n;
}

export function markAllRead(): void {
  const now = new Date().toISOString();
  for (const n of notifications) {
    if (n.status === 'UNREAD') {
      n.status = 'READ';
      n.readAt = now;
    }
  }
}

export function removeNotification(id: string): boolean {
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  notifications.splice(idx, 1);
  return true;
}
