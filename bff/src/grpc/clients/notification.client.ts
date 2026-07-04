import { createClientFactory, type Client } from 'nice-grpc';
import type { Notification, NotificationStatus as SharedNotificationStatus, NotificationType as SharedNotificationType } from '@candle/shared';
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';
import { createDeadlineInterceptor } from '../interceptors/deadline.interceptor';
import { createIdempotencyInterceptor } from '../idempotency/interceptor';
import { buildCommandMetadata } from '../idempotency';
import {
  DevicePlatform,
  NotificationStatus as ProtoNotificationStatus,
  NotificationType as ProtoNotificationType,
  NotificationServiceDefinition,
  type Notification as ProtoNotification,
} from '../gen/candle/notification/v1/notification';
import { env } from '../../config/env';

export interface ListNotificationsRequest {
  userId: string;
  limit?: number;
  offset?: number;
  status?: SharedNotificationStatus;
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
  // proto NotificationService엔 read-all/delete RPC가 없어 미지원 — 라우트는 mock 경로를 쓴다.
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

// proto 알림 유형 → 프론트가 아는 shared 유형. 시세/장운영 알림만 표현 가능하며
// 체결(BUY/SELL_FILLED)·미지정은 shared union에 대응값이 없어 목록에서 제외한다.
function toSharedType(t: ProtoNotificationType): SharedNotificationType | null {
  switch (t) {
    case ProtoNotificationType.NOTIFICATION_TYPE_PRICE_RISE:
      return 'surge';
    case ProtoNotificationType.NOTIFICATION_TYPE_PRICE_FALL:
      return 'crash';
    case ProtoNotificationType.NOTIFICATION_TYPE_MARKET_OPEN:
      return 'market_open';
    case ProtoNotificationType.NOTIFICATION_TYPE_MARKET_CLOSE:
      return 'market_close';
    default:
      return null;
  }
}

const toSharedStatus = (s: ProtoNotificationStatus): SharedNotificationStatus =>
  s === ProtoNotificationStatus.NOTIFICATION_STATUS_READ ? 'READ' : 'UNREAD';

/** proto Notification → shared Notification. symbol/name/meta는 meta_json(JSON)에서 추출. */
function toShared(n: ProtoNotification): Notification | null {
  const type = toSharedType(n.type);
  if (!type) return null;
  let meta: Record<string, unknown> = {};
  if (n.metaJson) {
    try {
      meta = JSON.parse(n.metaJson) as Record<string, unknown>;
    } catch {
      meta = {};
    }
  }
  return {
    id: n.id,
    symbol: typeof meta.symbol === 'string' ? meta.symbol : '',
    name: typeof meta.name === 'string' ? meta.name : n.title,
    type,
    status: toSharedStatus(n.status),
    message: n.body || n.title,
    meta,
    triggeredAt: (n.triggeredAt ?? n.createdAt ?? new Date()).toISOString(),
    ...(n.readAt ? { readAt: n.readAt.toISOString() } : {}),
  };
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

  async listNotifications(req: ListNotificationsRequest, opts?: GrpcCallOptions): Promise<Notification[]> {
    const limit = req.limit ?? 20;
    const offset = req.offset ?? 0;
    // proto는 token 기반 페이징 — offset 지원이 없어 (offset+limit)만큼 받고 BFF에서 slice.
    const res = await this.client.listNotifications(
      { userId: req.userId, pageRequest: { pageSize: offset + limit, pageToken: '' } },
      opts,
    );
    let mapped = res.notifications
      .map(toShared)
      .filter((n): n is Notification => n !== null)
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
    if (req.status) mapped = mapped.filter((n) => n.status === req.status);
    return mapped.slice(offset, offset + limit);
  }

  async getUnreadCount(req: { userId: string }, opts?: GrpcCallOptions): Promise<{ count: number }> {
    const res = await this.client.countUnread({ userId: req.userId }, opts);
    return { count: Number(res.unreadCount) };
  }

  async markRead(req: { userId: string; notificationId: string }, opts?: GrpcCallOptions): Promise<void> {
    const callOpts = opts ?? { userId: req.userId };
    await this.client.markAsRead(
      { userId: req.userId, notificationId: req.notificationId, commandMetadata: buildCommandMetadata(callOpts) },
      callOpts,
    );
  }

  // proto 미지원 — 라우트가 grpc 모드에서도 mock 경로로 폴백한다.
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
