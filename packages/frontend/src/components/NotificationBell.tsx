import { usePushNotifications } from '../hooks/usePushNotifications'

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  NEW_INSCRIPTION: '🏋️ Nouvelle inscription à une séance',
  NEW_WITHDRAWAL: '👋 Désistement d\'un inscrit',
  CAR_AVAILABLE: '🚗 Voiture disponible',
  NO_CAR: '😬 Aucune voiture disponible',
  DRIVER_LEFT: '🚨 Chauffeur désisté',
  USER_BANNED: '🔨 Utilisateur banni',
  PASSENGER_JOINED: '🙋 Passager rejoint ma voiture',
  PASSENGER_LEFT: '🚪 Passager quitté ma voiture',
  PASSENGER_KICKED: '👢 Éjecté d\'une voiture',
}

const ALL_TYPES = Object.keys(NOTIFICATION_TYPE_LABELS)

function isTypeEnabled(type: string, enabledTypes: string[]): boolean {
  return enabledTypes.length === 0 || enabledTypes.includes(type)
}

function toggleType(type: string, enabledTypes: string[]): string[] {
  if (isTypeEnabled(type, enabledTypes)) {
    const next = enabledTypes.length === 0
      ? ALL_TYPES.filter((t) => t !== type)
      : enabledTypes.filter((t) => t !== type)
    return next
  }
  const next = [...enabledTypes, type]
  return next.length === ALL_TYPES.length ? [] : next
}

export function NotificationBell() {
  const { isSubscribed, isLoading, error, permission, enabledTypes, subscribe, unsubscribe, updatePreferences } =
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

      {isSubscribed && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-primary-700">Types de notifications :</p>
          {ALL_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTypeEnabled(type, enabledTypes)}
                onChange={() => updatePreferences(toggleType(type, enabledTypes))}
                className="accent-primary-600"
              />
              <span className="text-sm text-primary-800">{NOTIFICATION_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}
