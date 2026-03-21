// Service Worker minimal pour le développement — gestion des push notifications uniquement
// En production, ce fichier est remplacé par le SW compilé par vite-plugin-pwa (avec Workbox)

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  const icon = data.icon ?? '/pwa-192x192.png'

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon,
      badge: '/pwa-192x192.png',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? '/'

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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
