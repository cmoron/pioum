import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Immediate check on mount to catch waiting SW (fixes missed events on PC)
        registration.update()
        // Periodic check for updates (important for iOS WebClip standalone mode)
        setInterval(() => {
          registration.update()
        }, UPDATE_CHECK_INTERVAL_MS)
      }
    },
    onRegisterError(error) {
      console.error('Service worker registration error:', error)
    },
  })

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  const handleDismiss = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
      <div className="rounded-warm bg-primary-50 border border-primary-200 shadow-warm-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-primary-700">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-900">
              Nouvelle version disponible
            </p>
            <p className="mt-1 text-sm text-primary-700">
              Actualise pour profiter des dernières améliorations.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleUpdate}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-warm bg-primary-700 text-white hover:bg-primary-800 transition-colors"
              >
                Actualiser
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-warm text-primary-700 hover:bg-primary-100 transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
