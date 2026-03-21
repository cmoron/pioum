import { usePushNotifications } from '../hooks/usePushNotifications'

export function NotificationBell() {
  const { isSubscribed, isLoading, error, permission, subscribe, unsubscribe } =
    usePushNotifications()

  // PWA non installée sur iOS — Push non disponible (avant le check compatibilité
  // car WKWebView n'expose pas Notification ni serviceWorker)
  // isIOS combine UA (mode normal) et 'standalone' in navigator (mode "version ordinateur"
  // où le UA devient desktop mais la propriété WebKit reste présente)
  const isStandalone = globalThis.matchMedia('(display-mode: standalone)').matches
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || 'standalone' in navigator
  if (isIOS && !isStandalone) {
    return (
      <p className="text-sm text-primary-600">
        📲 Pour activer les notifications, installe l'app via &laquo; Ajouter à l'écran d'accueil &raquo;
      </p>
    )
  }

  // Navigateur non compatible (après le check iOS pour éviter return null prématuré)
  if (!('Notification' in globalThis) || !('serviceWorker' in navigator)) return null

  if (permission === 'denied') {
    return (
      <p className="text-sm text-red-500">
        🔕 Notifications bloquées — modifie les réglages de ton navigateur
      </p>
    )
  }

  return (
    <div>
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-warm font-medium transition-colors disabled:opacity-50 ${
          isSubscribed
            ? 'bg-primary-100 text-primary-800 hover:bg-primary-200 border-2 border-primary-300'
            : 'btn-primary'
        }`}
      >
        {isLoading && <span className="text-sm">Chargement...</span>}
        {!isLoading && isSubscribed && <>🔕 Désactiver les notifications</>}
        {!isLoading && !isSubscribed && <>🔔 Activer les notifications</>}
      </button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}
