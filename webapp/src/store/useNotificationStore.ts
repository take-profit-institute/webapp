'use client';
import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  panelOpen: boolean;
  setUnreadCount: (n: number) => void;
  decrement: () => void;
  resetCount: () => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  panelOpen: false,

  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  resetCount: () => set({ unreadCount: 0 }),
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}));
