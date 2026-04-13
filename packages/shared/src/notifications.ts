export const NOTIFICATION_TYPES = [
  'NEW_INSCRIPTION',
  'NEW_WITHDRAWAL',
  'CAR_AVAILABLE',
  'DRIVER_LEFT',
  'USER_BANNED',
  'PASSENGER_JOINED',
  'PASSENGER_LEFT',
  'PASSENGER_KICKED',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type PioumNotificationPayload = {
  title: string
  body: string
  url: string
  type: NotificationType
}
