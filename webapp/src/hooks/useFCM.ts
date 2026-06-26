'use client';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNotificationStore } from '@/store/useNotificationStore';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

async function registerWebFCM() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const { messaging } = await import('@/lib/firebase');
  if (!messaging) return;

  const { getToken, onMessage } = await import('firebase/messaging');

  await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const registration = await navigator.serviceWorker.ready;

  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (token) await sendTokenToBFF(token);

  // Foreground message handler
  onMessage(messaging, (payload) => {
    const { setUnreadCount } = useNotificationStore.getState();
    setUnreadCount(useNotificationStore.getState().unreadCount + 1);

    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title ?? '알림', {
        body: payload.notification?.body,
        icon: '/icons/icon-192x192.png',
      });
    }
  });
}

async function registerNativeFCM() {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  const result = await PushNotifications.requestPermissions();
  if (result.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async ({ value: token }) => {
    await sendTokenToBFF(token);
  });

  PushNotifications.addListener('pushNotificationReceived', () => {
    const { setUnreadCount } = useNotificationStore.getState();
    setUnreadCount(useNotificationStore.getState().unreadCount + 1);
  });
}

async function sendTokenToBFF(token: string) {
  await fetch(`${API_BASE}/api/notifications/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
  });
}

export function useFCM() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      registerNativeFCM().catch(console.error);
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      registerWebFCM().catch(console.error);
    }
  }, []);
}
