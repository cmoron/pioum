import { useState, useEffect } from 'react'
import {
  registerServiceWorker,
  subscribeToPush,
  sendSubscriptionToServer,
  unsubscribeFromPush,
  checkExistingSubscription,
} from '../services/pushNotification.service'

type PushState = {
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  permission: NotificationPermission
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(): PushState {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  // Vérifie l'état initial au montage
  useEffect(() => {
    if (!('Notification' in globalThis)) {
      setIsLoading(false)
      return
    }
    setPermission(Notification.permission)
    checkExistingSubscription()
      .then(setIsSubscribed)
      .catch(() => setIsSubscribed(false))
      .finally(() => setIsLoading(false))
  }, [])

  const subscribe = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const registration = await registerServiceWorker()
      const subscription = await subscribeToPush(registration)
      await sendSubscriptionToServer(subscription)
      setIsSubscribed(true)
      setPermission('granted')
    } catch (err) {
      if ('Notification' in globalThis && Notification.permission === 'denied') {
        setError('Notifications bloquées — autorise-les dans les réglages de ton navigateur')
      } else if (!('serviceWorker' in navigator) || !('PushManager' in globalThis)) {
        setError('Les notifications push ne sont pas supportées sur ce navigateur')
      } else {
        setError("Impossible d'activer les notifications — réessaie dans quelques instants")
      }
      console.error('[Pioum] Erreur abonnement push:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await unsubscribeFromPush()
      setIsSubscribed(false)
    } catch (err) {
      setError('Impossible de désactiver les notifications')
      console.error('[Pioum] Erreur désabonnement push:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return { isSubscribed, isLoading, error, permission, subscribe, unsubscribe }
}
