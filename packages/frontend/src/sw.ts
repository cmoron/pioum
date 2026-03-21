/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Requis par vite-plugin-pwa injectManifest — injecte la liste des assets à précacher
precacheAndRoute(self.__WB_MANIFEST)

type NotificationData = {
  title: string
  body: string
  url?: string
  type?: 'NEW_INSCRIPTION' | 'CAR_AVAILABLE' | 'NO_CAR' | 'DRIVER_LEFT' | 'USER_BANNED'
}

const iconMap: Record<string, string> = {
  NEW_INSCRIPTION: '/pwa-192x192.png',
  CAR_AVAILABLE: '/pwa-192x192.png',
  NO_CAR: '/pwa-192x192.png',
  DRIVER_LEFT: '/pwa-192x192.png',
  USER_BANNED: '/pwa-192x192.png',
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json() as NotificationData
  const icon = data.type ? (iconMap[data.type] ?? '/pwa-192x192.png') : '/pwa-192x192.png'

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon,
      badge: '/pwa-192x192.png',
      data: { url: data.url ?? '/' },
    } as NotificationOptions)
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) return client.focus()
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
