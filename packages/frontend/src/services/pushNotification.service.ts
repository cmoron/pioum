const API_BASE = import.meta.env.VITE_API_URL || '/api'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/')
  const rawData = globalThis.atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.codePointAt(i) ?? 0
  }
  return buffer.buffer
}

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/notifications/vapid-public-key`)
  if (!res.ok) throw new Error('Impossible de récupérer la clé VAPID')
  const { vapidPublicKey } = (await res.json()) as { vapidPublicKey: string }
  return vapidPublicKey
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers non supportés sur ce navigateur')
  }
  const swUrl = import.meta.env.DEV ? '/dev-sw.js' : '/sw.js'
  return navigator.serviceWorker.register(swUrl)
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  const vapidPublicKey = await getVapidPublicKey()
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
}

export async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subscription }),
  })
  if (!res.ok) throw new Error("Erreur lors de l'enregistrement de l'abonnement")
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg) {
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  }
  await fetch(`${API_BASE}/notifications/unsubscribe`, {
    method: 'POST',
    credentials: 'include',
  })
}

export async function checkExistingSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in globalThis)) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return false
  const res = await fetch(`${API_BASE}/notifications/subscription`, { credentials: 'include' })
  if (!res.ok) return false
  const { subscribed } = (await res.json()) as { subscribed: boolean }
  return subscribed
}
