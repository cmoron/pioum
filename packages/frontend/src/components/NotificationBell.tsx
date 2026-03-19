import { usePushNotifications } from '../hooks/usePushNotifications'

export function NotificationBell() {
  const { isSubscribed, isLoading, error, permission, subscribe, unsubscribe } =
    usePushNotifications()

  // Navigateur non compatible
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null

  // PWA non installée sur iOS — Push non disponible
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (isIOS && !isStandalone) {
    return (
      <p className="text-sm text-primary-600">
        📲 Pour activer les notifications, installe l'app via &laquo; Ajouter à l'écran d'accueil &raquo;
      </p>
    )
  }

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
        {isLoading ? (
          <span className="text-sm">Chargement...</span>
        ) : isSubscribed ? (
          <>🔕 Désactiver les notifications</>
        ) : (
          <>🔔 Activer les notifications</>
        )}
      </button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}
