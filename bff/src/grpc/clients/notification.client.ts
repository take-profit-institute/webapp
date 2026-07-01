import { createClientFactory, type Client } from 'nice-grpc';
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';
import { createDeadlineInterceptor } from '../interceptors/deadline.interceptor';
import { createIdempotencyInterceptor } from '../idempotency/interceptor';
import { buildCommandMetadata } from '../idempotency';
import {
  DevicePlatform,
  NotificationServiceDefinition,
} from '../gen/candle/notification/v1/notification';
import { env } from '../../config/env';

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

export type RegisterDevicePlatform = 'web' | 'ios' | 'android';

export interface RegisterDeviceTokenRequest {
  userId: string;
  token: string;
  platform: RegisterDevicePlatform;
  deviceId?: string;
}

export interface NotificationServiceClient {
  registerDeviceToken(req: RegisterDeviceTokenRequest, opts: GrpcCallOptions): Promise<{ deviceTokenId: string }>;
  listNotifications(req: ListNotificationsRequest, opts?: GrpcCallOptions): Promise<Notification[]>;
  getUnreadCount(req: { userId: string }, opts?: GrpcCallOptions): Promise<{ count: number }>;
  markRead(req: { userId: string; notificationId: string }, opts?: GrpcCallOptions): Promise<void>;
  markAllRead(req: { userId: string }, opts?: GrpcCallOptions): Promise<void>;
  deleteNotification(req: { userId: string; notificationId: string }, opts?: GrpcCallOptions): Promise<void>;
}

type ProtoNotificationClient = Client<typeof NotificationServiceDefinition, GrpcCallOptions>;

function toProtoPlatform(platform: RegisterDevicePlatform): DevicePlatform {
  switch (platform) {
    case 'web':
      return DevicePlatform.DEVICE_PLATFORM_WEB;
    case 'android':
      return DevicePlatform.DEVICE_PLATFORM_ANDROID;
    case 'ios':
      return DevicePlatform.DEVICE_PLATFORM_IOS;
  }
}

class GrpcNotificationServiceClient implements NotificationServiceClient {
  constructor(private readonly client: ProtoNotificationClient) {}

  async registerDeviceToken(
    req: RegisterDeviceTokenRequest,
    opts: GrpcCallOptions,
  ): Promise<{ deviceTokenId: string }> {
    const res = await this.client.registerDeviceToken(
      {
        userId: req.userId,
        fcmToken: req.token,
        platform: toProtoPlatform(req.platform),
        deviceId: req.deviceId ?? '',
        commandMetadata: buildCommandMetadata(opts),
      },
      opts,
    );
    return { deviceTokenId: res.deviceTokenId };
  }

  listNotifications(): Promise<Notification[]> { return notImplemented('NotificationService', 'listNotifications'); }
  getUnreadCount(): Promise<{ count: number }> { return notImplemented('NotificationService', 'getUnreadCount'); }
  markRead(): Promise<void> { return notImplemented('NotificationService', 'markRead'); }
  markAllRead(): Promise<void> { return notImplemented('NotificationService', 'markAllRead'); }
  deleteNotification(): Promise<void> { return notImplemented('NotificationService', 'deleteNotification'); }
}

export function createNotificationServiceClient(channel: GrpcChannel): NotificationServiceClient {
  const client = createClientFactory()
    .use(createDeadlineInterceptor(env.grpc.deadlineMs))
    .use(createIdempotencyInterceptor())
    .create(NotificationServiceDefinition, channel);
  return new GrpcNotificationServiceClient(client);
}
