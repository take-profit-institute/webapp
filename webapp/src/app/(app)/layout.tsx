'use client';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import NotificationPanel from '@/components/NotificationPanel';
import { getWatchlist, getUnreadCount } from '@/apis';
import { useWatchlistStore, useNotificationStore } from '@/store/useStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { setSymbols } = useWatchlistStore();
  const { setUnreadCount } = useNotificationStore();

  // Bootstrap watchlist store and unread count on first mount
  useEffect(() => {
    getWatchlist()
      .then((list) => setSymbols(list.map((q) => q.symbol)))
      .catch(() => {});
    getUnreadCount()
      .then((res) => setUnreadCount(res.count))
      .catch(() => {});
  }, [setSymbols, setUnreadCount]);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      <main className="main-scroll-area flex-1 overflow-auto">
        {children}
      </main>
      <BottomNav />
      <NotificationPanel />
    </div>
  );
}
