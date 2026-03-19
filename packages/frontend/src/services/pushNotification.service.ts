function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i)
  }
  return buffer.buffer
}

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch('/api/notifications/vapid-public-key')
  if (!res.ok) throw new Error('Impossible de récupérer la clé VAPID')
  const { vapidPublicKey } = (await res.json()) as { vapidPublicKey: string }
  return vapidPublicKey
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers non supportés sur ce navigateur')
  }
  return navigator.serviceWorker.register('/sw.js')
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
  const res = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subscription }),
  })
  if (!res.ok) throw new Error("Erreur lors de l'enregistrement de l'abonnement")
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await sub.unsubscribe()
  }
  await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    credentials: 'include',
  })
}

export async function checkExistingSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub !== null
}
