/**
 * NotificationService gRPC client stub.
 * Owns: in-app notifications, unread counts, read/delete.
 * Future: push token registration, push dispatch.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export type NotificationType = 'surge' | 'crash' | 'market_open' | 'market_close' | 'order_executed' | 'mission_complete';
export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  status: NotificationStatus;
  createdAt: string;
  meta: Record<string, unknown>;
}

export interface ListNotificationsRequest {
  userId: string;
  limit?: number;
  offset?: number;
  status?: NotificationStatus;
}

export interface NotificationServiceClient {
  listNotifications(req: ListNotificationsRequest, opts?: GrpcCallOptions): Promise<Notification[]>;
  getUnreadCount(req: { userId: string }, opts?: GrpcCallOptions): Promise<{ count: number }>;
  markRead(req: { userId: string; notificationId: string }, opts?: GrpcCallOptions): Promise<void>;
  markAllRead(req: { userId: string }, opts?: GrpcCallOptions): Promise<void>;
  deleteNotification(req: { userId: string; notificationId: string }, opts?: GrpcCallOptions): Promise<void>;
}

class StubNotificationServiceClient implements NotificationServiceClient {
  listNotifications(): Promise<Notification[]> { return notImplemented('NotificationService', 'listNotifications'); }
  getUnreadCount(): Promise<{ count: number }> { return notImplemented('NotificationService', 'getUnreadCount'); }
  markRead(): Promise<void> { return notImplemented('NotificationService', 'markRead'); }
  markAllRead(): Promise<void> { return notImplemented('NotificationService', 'markAllRead'); }
  deleteNotification(): Promise<void> { return notImplemented('NotificationService', 'deleteNotification'); }
}

export function createNotificationServiceClient(_channel: GrpcChannel): NotificationServiceClient {
  return new StubNotificationServiceClient();
}
