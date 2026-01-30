import { useEffect, useState, useCallback } from 'react'
import { parseISO, startOfWeek, subWeeks, startOfMonth, isAfter, isEqual } from 'date-fns'
import { Session, api } from '../lib/api'
import { SessionCard } from './SessionCard'
import { LoadingSpinner } from './LoadingSpinner'

interface PastSessionsListProps {
  groupId: string
  refreshTrigger?: number
}

type TimeGroup = {
  label: string
  sessions: Session[]
}

function groupSessionsByTimePeriod(sessions: Session[]): TimeGroup[] {
  const now = new Date()
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 })
  const startOfLastWeek = subWeeks(startOfThisWeek, 1)
  const startOfThisMonth = startOfMonth(now)

  const groups: TimeGroup[] = []

  const thisWeek: Session[] = []
  const lastWeek: Session[] = []
  const thisMonth: Session[] = []
  const older: Session[] = []

  for (const session of sessions) {
    const date = parseISO(session.startTime)

    if (isAfter(date, startOfThisWeek) || isEqual(date, startOfThisWeek)) {
      thisWeek.push(session)
    } else if (isAfter(date, startOfLastWeek) || isEqual(date, startOfLastWeek)) {
      lastWeek.push(session)
    } else if (isAfter(date, startOfThisMonth) || isEqual(date, startOfThisMonth)) {
      thisMonth.push(session)
    } else {
      older.push(session)
    }
  }

  if (thisWeek.length > 0) groups.push({ label: 'Cette semaine', sessions: thisWeek })
  if (lastWeek.length > 0) groups.push({ label: 'Semaine dernière', sessions: lastWeek })
  if (thisMonth.length > 0) groups.push({ label: 'Ce mois-ci', sessions: thisMonth })
  if (older.length > 0) groups.push({ label: 'Plus ancien', sessions: older })

  return groups
}

export function PastSessionsList({ groupId, refreshTrigger = 0 }: PastSessionsListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const fetchSessions = useCallback(async (loadMore = false, cursorOverride?: string) => {
    try {
      if (loadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const result = await api.getPastSessions(groupId, 15, loadMore ? cursorOverride : undefined)

      if (loadMore) {
        setSessions(prev => [...prev, ...result.sessions])
      } else {
        setSessions(result.sessions)
      }

      setHasMore(result.hasMore)
      setCursor(result.nextCursor)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [groupId])

  // Initial fetch
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSessions()
    }
  }, [refreshTrigger, fetchSessions])

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

  // Empty refresh handler (read-only, no actual refresh needed)
  const handleRefresh = useCallback(() => {
    // No-op for past sessions
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-primary-600 mb-1">Aucune séance passée</p>
        <p className="text-sm text-primary-500">
          L'historique apparaîtra après vos premières séances
        </p>
      </div>
    )
  }

  const groupedSessions = groupSessionsByTimePeriod(sessions)

  return (
    <div className="space-y-4">
      {groupedSessions.map(group => (
        <div key={group.label}>
          <h3 className="text-sm font-medium text-primary-500 mb-2 px-1">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onRefresh={handleRefresh}
                compact
                isPast
                expanded={expandedSessions.has(session.id)}
                onToggleExpand={() => toggleSessionExpanded(session.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Load more button */}
      {hasMore && (
        <button
          onClick={() => fetchSessions(true, cursor)}
          disabled={loadingMore}
          className="w-full py-3 text-sm text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-warm transition-colors flex items-center justify-center gap-2"
        >
          {loadingMore ? (
            <>
              <LoadingSpinner size="sm" />
              Chargement...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Voir plus
            </>
          )}
        </button>
      )}
    </div>
  )
}
