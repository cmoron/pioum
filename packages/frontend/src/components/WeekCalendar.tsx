import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  parseISO,
  isBefore,
  startOfDay
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { Session, api } from '../lib/api'
import { SessionCard } from './SessionCard'
import { LoadingSpinner } from './LoadingSpinner'

interface WeekCalendarProps {
  groupId: string
  refreshTrigger?: number
  isAdmin?: boolean
}

const DAY_NAMES = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

export function WeekCalendar({ groupId, refreshTrigger = 0, isAdmin = false }: WeekCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [bansReceived, setBansReceived] = useState<string[]>([])

  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart])
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: weekEnd }),
    [currentWeekStart, weekEnd]
  )

  const fetchSessions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      // Fetch sessions for the visible week range
      const result = await api.getUpcomingSessions(groupId, 50)
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

  useEffect(() => {
    fetchSessions()
    fetchBans()
  }, [fetchSessions, fetchBans])

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSessions(false)
    }
  }, [refreshTrigger, fetchSessions])

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchSessions(false), 10_000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  const handleRefresh = useCallback(() => {
    fetchSessions(false)
  }, [fetchSessions])

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1))
    setSelectedDate(null)
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    setSelectedDate(null)
  }

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const session of sessions) {
      const dateKey = format(parseISO(session.date), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      existing.push(session)
      map.set(dateKey, existing)
    }
    return map
  }, [sessions])

  // Check if current week contains today
  const isCurrentWeek = weekDays.some(day => isToday(day))
  const isPastWeek = isBefore(weekEnd, startOfDay(new Date()))

  if (loading && sessions.length === 0) {
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

  const selectedDateSessions = selectedDate
    ? sessionsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : []

  return (
    <div className="space-y-3">
      {/* Week Navigation */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-warm hover:bg-primary-100 transition-colors text-primary-700"
            aria-label="Semaine précédente"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <p className="font-medium text-primary-800">
              {format(currentWeekStart, 'd', { locale: fr })} - {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
            </p>
            {!isCurrentWeek && (
              <button
                onClick={goToToday}
                className="text-xs text-primary-600 hover:text-primary-800 underline"
              >
                Revenir à aujourd'hui
              </button>
            )}
          </div>

          <button
            onClick={goToNextWeek}
            className="p-2 rounded-warm hover:bg-primary-100 transition-colors text-primary-700"
            aria-label="Semaine suivante"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const daySessions = sessionsByDate.get(dateKey) || []
            const hasSession = daySessions.length > 0
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isDayToday = isToday(day)
            const isPast = isBefore(day, startOfDay(new Date()))

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`
                  flex flex-col items-center p-2 rounded-warm transition-all
                  ${isSelected
                    ? 'bg-primary-600 text-white shadow-warm'
                    : isDayToday
                      ? 'bg-primary-100 text-primary-800'
                      : 'hover:bg-primary-50'
                  }
                  ${isPast && !isDayToday && !isSelected ? 'opacity-50' : ''}
                `}
              >
                <span className={`text-xs uppercase ${isSelected ? 'text-primary-100' : 'text-primary-500'}`}>
                  {DAY_NAMES[index]}
                </span>
                <span className={`text-lg font-medium ${isSelected ? 'text-white' : 'text-primary-800'}`}>
                  {format(day, 'd')}
                </span>
                {/* Session indicators */}
                <div className="flex gap-0.5 mt-1 h-2">
                  {hasSession ? (
                    daySessions.slice(0, 3).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-primary-200' : 'bg-primary-500'
                        }`}
                      />
                    ))
                  ) : (
                    <span className="w-1.5 h-1.5" /> // Placeholder for alignment
                  )}
                  {daySessions.length > 3 && (
                    <span className={`text-xs ${isSelected ? 'text-primary-200' : 'text-primary-500'}`}>
                      +{daySessions.length - 3}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Sessions */}
      {selectedDate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-primary-800 capitalize">
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Fermer
            </button>
          </div>

          {selectedDateSessions.length === 0 ? (
            <div className="card p-4 text-center text-primary-500">
              {isPastWeek || isBefore(selectedDate, startOfDay(new Date()))
                ? 'Aucune séance ce jour-là'
                : 'Aucune séance prévue'}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onRefresh={handleRefresh}
                  bansReceived={bansReceived}
                  compact
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick summary when no date selected */}
      {!selectedDate && (
        <p className="text-sm text-center text-primary-500 py-2">
          Sélectionnez un jour pour voir les séances
        </p>
      )}
    </div>
  )
}
