import { Type, type Static } from '@sinclair/typebox';

/**
 * 알림 유형 — 새 유형 추가 시 이 union에 Literal만 추가하면 됩니다.
 * meta 필드로 유형별 추가 데이터를 전달합니다.
 *
 * 현재: market_open | market_close | surge | crash
 * 확장 예시: new_52w_high | new_52w_low | volume_spike | price_target_reached | news_alert
 */
export const NotificationType = Type.Union([
  Type.Literal('market_open'),
  Type.Literal('market_close'),
  Type.Literal('surge'),
  Type.Literal('crash'),
]);
export type NotificationType = Static<typeof NotificationType>;

export const NotificationStatus = Type.Union([
  Type.Literal('UNREAD'),
  Type.Literal('READ'),
]);
export type NotificationStatus = Static<typeof NotificationStatus>;

export const DevicePlatform = Type.Union([
  Type.Literal('web'),
  Type.Literal('ios'),
  Type.Literal('android'),
]);
export type DevicePlatform = Static<typeof DevicePlatform>;

export const RegisterDeviceTokenBody = Type.Object({
  token: Type.String({ minLength: 1 }),
  platform: DevicePlatform,
  deviceId: Type.Optional(Type.String({ minLength: 1, maxLength: 256 })),
});
export type RegisterDeviceTokenBody = Static<typeof RegisterDeviceTokenBody>;

export const RegisterDeviceTokenResult = Type.Object({
  deviceTokenId: Type.String(),
});
export type RegisterDeviceTokenResult = Static<typeof RegisterDeviceTokenResult>;

export const Notification = Type.Object({
  id: Type.String(),
  symbol: Type.String(),
  name: Type.String(),
  type: NotificationType,
  status: NotificationStatus,
  /** 사용자에게 보여줄 메시지 문자열 */
  message: Type.String(),
  /**
   * 유형별 추가 데이터.
   * surge/crash → { changePercent: number }
   * 신규 유형 추가 시 여기에 원하는 필드를 자유롭게 담으면 됩니다.
   */
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  triggeredAt: Type.String({ format: 'date-time' }),
  readAt: Type.Optional(Type.String({ format: 'date-time' })),
});
export type Notification = Static<typeof Notification>;

export const NotificationListQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  status: Type.Optional(NotificationStatus),
});
export type NotificationListQuery = Static<typeof NotificationListQuery>;

export const NotificationIdParams = Type.Object({ id: Type.String() });
export type NotificationIdParams = Static<typeof NotificationIdParams>;

export const UnreadCountResult = Type.Object({ count: Type.Integer() });
export type UnreadCountResult = Static<typeof UnreadCountResult>;

export const AdminNotificationTarget = Type.Union([
  Type.Literal('user'),
]);
export type AdminNotificationTarget = Static<typeof AdminNotificationTarget>;

export const AdminSendNotificationBody = Type.Object({
  target: AdminNotificationTarget,
  userId: Type.String({ minLength: 1 }),
  type: NotificationType,
  title: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
  meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export type AdminSendNotificationBody = Static<typeof AdminSendNotificationBody>;

export const AdminSendNotificationResult = Type.Object({
  notification: Notification,
});
export type AdminSendNotificationResult = Static<typeof AdminSendNotificationResult>;
