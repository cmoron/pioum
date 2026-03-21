import { buildPushHTTPRequest } from '@pushforge/builder'
import { prisma } from '../lib/prisma.js'

export type WebPushSubscription = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export type PioumNotificationPayload = {
  title: string
  body: string
  url: string
  type: 'NEW_INSCRIPTION' | 'CAR_AVAILABLE' | 'NO_CAR' | 'DRIVER_LEFT'
}

export async function saveSubscription(userId: string, sub: WebPushSubscription): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { userId },
    update: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  })
}

export async function removeSubscription(userId: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId } })
}

export async function notifyUser(
  userId: string,
  payload: PioumNotificationPayload
): Promise<void> {
  const record = await prisma.pushSubscription.findUnique({ where: { userId } })
  if (!record) return

  const sub: WebPushSubscription = {
    endpoint: record.endpoint,
    keys: { p256dh: record.p256dh, auth: record.auth },
  }

  const privateJWK = JSON.parse(process.env.VAPID_PRIVATE_KEY_JWK!) as object

  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK,
    subscription: sub,
    message: {
      payload: payload as unknown as string,
      options: {
        ttl: 3600,
        urgency: 'normal',
        topic: 'pioum-session',
      },
      adminContact: process.env.VAPID_EMAIL!,
    },
  })

  const response = await fetch(endpoint, { method: 'POST', headers, body })

  // Subscription expirée → suppression immédiate
  if (response.status === 410) {
    await removeSubscription(userId)
    return
  }

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${await response.text()}`)
  }
}

export async function notifyGroupMembers(
  groupId: string,
  excludeUserId: string,
  payload: PioumNotificationPayload
): Promise<void> {
  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { not: excludeUserId } },
    select: { userId: true },
  })

  await Promise.allSettled(
    members.map(({ userId }) => notifyUser(userId, payload))
  )
}
