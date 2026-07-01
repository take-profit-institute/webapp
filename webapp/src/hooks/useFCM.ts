'use client';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { registerNotificationDevice } from '@/apis/notifications';
import type { DevicePlatform } from '@/lib/api-types';
import { useNotificationStore } from '@/store/useNotificationStore';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const DEVICE_ID_KEY = 'candle:fcm:device-id';

function createDeviceId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getDeviceId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const saved = window.localStorage.getItem(DEVICE_ID_KEY);
    if (saved) return saved;

    const next = createDeviceId();
    window.localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}

function getDevicePlatform(): DevicePlatform {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') return platform;
  return 'web';
}

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
  await registerNotificationDevice({
    token,
    platform: getDevicePlatform(),
    deviceId: getDeviceId(),
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
