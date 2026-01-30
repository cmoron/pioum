import { useEffect, useState, useCallback } from 'react'
import { endOfWeek, addWeeks, parseISO, isAfter, isBefore } from 'date-fns'
import { Session, api } from '../lib/api'
import { SessionCard } from './SessionCard'
import { LoadingSpinner } from './LoadingSpinner'

interface UpcomingSessionsListProps {
  groupId: string
  refreshTrigger?: number
  isAdmin?: boolean
}

export function UpcomingSessionsList({ groupId, refreshTrigger = 0, isAdmin = false }: UpcomingSessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bansReceived, setBansReceived] = useState<string[]>([])
  const [showNextWeek, setShowNextWeek] = useState(false)
  // Track which compact sessions are expanded (by session ID)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const fetchSessions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      // Fetch enough sessions to cover 2 weeks
      const result = await api.getUpcomingSessions(groupId, 30)
      setSessions(result.sessions)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  const fetchBans = useCallback(async () => {
    try {
      const { bansReceived } = await api.getActiveBans()
      setBansReceived(bansReceived.map(b => b.giverId))
    } catch {
      // Ignore ban errors
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSessions()
    fetchBans()
  }, [fetchSessions, fetchBans])

  // Refetch when refreshTrigger changes (without showing loading spinner)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSessions(false)
    }
  }, [refreshTrigger, fetchSessions])

  // Poll for updates from other users every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchSessions(false), 10_000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  // Internal refresh handler for SessionCard actions
  const handleRefresh = useCallback(() => {
    fetchSessions(false)
  }, [fetchSessions])

  const toggleSessionExpanded = useCallback((sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <button onClick={() => fetchSessions()} className="btn-secondary">
          Réessayer
        </button>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center card">
        <div className="w-12 h-12 mx-auto mb-3 bg-primary-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-primary-600 mb-1">Aucune séance à venir</p>
        <p className="text-sm text-primary-500">
          Utilise le bouton + pour créer une séance
        </p>
      </div>
    )
  }

  // Filter sessions by week
  const now = new Date()
  const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 }) // Monday start
  const endOfNextWeek = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 })

  const thisWeekSessions = sessions.filter(s => {
    const date = parseISO(s.startTime)
    return isBefore(date, endOfThisWeek) || date.getTime() === endOfThisWeek.getTime()
  })

  const nextWeekSessions = sessions.filter(s => {
    const date = parseISO(s.startTime)
    return isAfter(date, endOfThisWeek) && (isBefore(date, endOfNextWeek) || date.getTime() === endOfNextWeek.getTime())
  })

  // First session shown prominently, rest in compact mode
  const firstSession = thisWeekSessions[0]
  const remainingThisWeek = thisWeekSessions.slice(1)

  return (
    <div className="space-y-3">
      {/* First/Next session - displayed prominently, always expanded */}
      {firstSession && (
        <SessionCard
          session={firstSession}
          onRefresh={handleRefresh}
          bansReceived={bansReceived}
          alwaysExpanded
          isAdmin={isAdmin}
        />
      )}

      {/* Remaining sessions this week - compact mode */}
      {remainingThisWeek.length > 0 && (
        <div className="space-y-2">
          {remainingThisWeek.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onRefresh={handleRefresh}
              bansReceived={bansReceived}
              compact
              expanded={expandedSessions.has(session.id)}
              onToggleExpand={() => toggleSessionExpanded(session.id)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Next week toggle */}
      {nextWeekSessions.length > 0 && (
        <div>
          <button
            onClick={() => setShowNextWeek(!showNextWeek)}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-800 flex items-center justify-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showNextWeek ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showNextWeek ? 'Masquer' : 'Afficher'} la semaine prochaine ({nextWeekSessions.length})
          </button>

          {showNextWeek && (
            <div className="space-y-2 mt-2">
              {nextWeekSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onRefresh={handleRefresh}
                  bansReceived={bansReceived}
                  compact
                  expanded={expandedSessions.has(session.id)}
                  onToggleExpand={() => toggleSessionExpanded(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* No more sessions message */}
      {remainingThisWeek.length === 0 && nextWeekSessions.length === 0 && thisWeekSessions.length === 1 && (
        <p className="text-sm text-center text-primary-500 py-2">
          Pas d'autre séance cette semaine
        </p>
      )}
    </div>
  )
}
