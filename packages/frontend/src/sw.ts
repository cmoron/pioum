/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { NOTIFICATION_TYPES, type NotificationType } from '@pioum/shared/notifications'

declare const self: ServiceWorkerGlobalScope

// Requis par vite-plugin-pwa injectManifest — injecte la liste des assets à précacher
precacheAndRoute(self.__WB_MANIFEST)

type NotificationData = {
  title: string
  body: string
  url?: string
  type?: NotificationType
}

const iconMap: Record<NotificationType, string> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t, '/pwa-192x192.png'])
) as Record<NotificationType, string>

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
