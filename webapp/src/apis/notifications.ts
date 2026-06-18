/** Notification endpoints (`/api/notifications/*`). */
import type { Notification, NotificationStatus, UnreadCountResult } from '@/lib/api-types';
import { apiClient } from './client';

export interface NotificationListParams {
  limit?: number;
  offset?: number;
  status?: NotificationStatus;
}

export function getNotifications(params: NotificationListParams = {}): Promise<Notification[]> {
  return apiClient.get<Notification[]>('/api/notifications', { ...params });
}

export function getUnreadCount(): Promise<UnreadCountResult> {
  return apiClient.get<UnreadCountResult>('/api/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<void> {
  return apiClient.patch<void>(`/api/notifications/${encodeURIComponent(id)}/read`);
}

export function markAllNotificationsRead(): Promise<void> {
  return apiClient.patch<void>('/api/notifications/read-all');
}

export function deleteNotification(id: string): Promise<void> {
  return apiClient.del(`/api/notifications/${encodeURIComponent(id)}`);
}
