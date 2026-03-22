import { buildPushHTTPRequest } from '@pushforge/builder'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/errorHandler.js'

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
  type: 'NEW_INSCRIPTION' | 'CAR_AVAILABLE' | 'NO_CAR' | 'DRIVER_LEFT' | 'USER_BANNED'
}

// ── VAPID key ──────────────────────────────────────────────────────────────

let _vapidKey: object | null = null

function getVapidKey(): object {
  if (!_vapidKey) {
    const raw = process.env.VAPID_PRIVATE_KEY_JWK
    if (!raw) throw new Error('VAPID_PRIVATE_KEY_JWK not configured')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed.kty || !parsed.crv || !parsed.d) {
      throw new Error('Invalid VAPID JWK format — missing required fields (kty, crv, d)')
    }
    _vapidKey = parsed
  }
  return _vapidKey
}

/**
 * Validates that all required notification env vars are present and well-formed.
 * Call at server startup — throws if misconfigured.
 */
export function validateNotificationConfig(): void {
  const required = ['VAPID_PRIVATE_KEY_JWK', 'VAPID_PUBLIC_KEY', 'VAPID_EMAIL'] as const
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(`Push notifications — variables manquantes : ${missing.join(', ')}`)
  }
  // Eagerly parse and validate the JWK so format errors surface at boot
  getVapidKey()
}

// ── Subscription management ────────────────────────────────────────────────

export async function saveSubscription(userId: string, sub: WebPushSubscription): Promise<void> {
  if (!sub.endpoint?.startsWith('https://')) {
    throw new AppError(400, 'Endpoint invalide (doit être https)')
  }
  if (!sub.keys?.p256dh || !sub.keys?.auth) {
    throw new AppError(400, 'Clés de souscription manquantes')
  }
  if (sub.endpoint.length > 500 || sub.keys.p256dh.length > 200 || sub.keys.auth.length > 100) {
    throw new AppError(400, 'Valeurs de souscription trop longues')
  }

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

// ── Push sending ───────────────────────────────────────────────────────────

type PushRecord = { userId: string; endpoint: string; p256dh: string; auth: string }

async function sendPushToRecord(record: PushRecord, payload: PioumNotificationPayload): Promise<void> {
  const sub: WebPushSubscription = {
    endpoint: record.endpoint,
    keys: { p256dh: record.p256dh, auth: record.auth },
  }

  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK: getVapidKey(),
    subscription: sub,
    message: {
      payload,
      options: { ttl: 3600, urgency: 'normal' },
      adminContact: process.env.VAPID_EMAIL!,
    },
  })

  const response = await fetch(endpoint, { method: 'POST', headers, body })

  if (response.status === 410) {
    // Subscription expirée — suppression silencieuse
    await removeSubscription(record.userId)
    return
  }

  if (response.status === 429 || response.status === 503) {
    throw new Error(`Push service temporairement indisponible (${response.status})`)
  }

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${await response.text()}`)
  }
}

export async function notifyUser(
  userId: string,
  payload: PioumNotificationPayload
): Promise<void> {
  const record = await prisma.pushSubscription.findUnique({ where: { userId } })
  if (!record) return
  await sendPushToRecord(record, payload)
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

  if (members.length === 0) return

  const userIds = members.map((m) => m.userId)

  // Requête unique pour toutes les souscriptions — évite le N+1
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  })

  const results = await Promise.allSettled(
    subscriptions.map((record) => sendPushToRecord(record, payload))
  )
  results.forEach((r) => {
    if (r.status === 'rejected') console.error('[push] sendPushToRecord failed:', r.reason)
  })
}
