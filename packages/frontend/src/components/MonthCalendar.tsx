import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  isBefore,
  startOfDay
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { Session, api } from '../lib/api'
import { SessionCard } from './SessionCard'
import { LoadingSpinner } from './LoadingSpinner'

interface MonthCalendarProps {
  groupId: string
  refreshTrigger?: number
  isAdmin?: boolean
}

const DAY_NAMES = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

export function MonthCalendar({ groupId, refreshTrigger = 0, isAdmin = false }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [bansReceived, setBansReceived] = useState<string[]>([])

  // Get all days to display (including padding days from prev/next month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  const fetchSessions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      // Fetch sessions for the visible calendar range (including padding days)
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
      const from = format(calendarStart, 'yyyy-MM-dd')
      const to = format(calendarEnd, 'yyyy-MM-dd')
      const result = await api.getSessionsByRange(groupId, from, to)
      setSessions(result.sessions)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [groupId, currentMonth])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentMonth])

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSessions(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchSessions(false), 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, currentMonth])

  const handleRefresh = useCallback(() => {
    fetchSessions(false)
  }, [fetchSessions])

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentMonth(startOfMonth(new Date()))
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

  // Check if current month contains today
  const isCurrentMonth = isSameMonth(currentMonth, new Date())

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

  // Split days into weeks for rendering
  const weeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  return (
    <div className="space-y-3">
      {/* Month Navigation */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-warm hover:bg-primary-100 transition-colors text-primary-700"
            aria-label="Mois précédent"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <p className="font-medium text-primary-800 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </p>
            {!isCurrentMonth && (
              <button
                onClick={goToToday}
                className="text-xs text-primary-600 hover:text-primary-800 underline"
              >
                Revenir à aujourd'hui
              </button>
            )}
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-warm hover:bg-primary-100 transition-colors text-primary-700"
            aria-label="Mois suivant"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map(name => (
            <div key={name} className="text-center text-xs uppercase text-primary-500 py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const daySessions = sessionsByDate.get(dateKey) || []
                const hasSession = daySessions.length > 0
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isDayToday = isToday(day)
                const isCurrentMonthDay = isSameMonth(day, currentMonth)
                const isPast = isBefore(day, startOfDay(new Date()))

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`
                      flex flex-col items-center p-1.5 rounded-warm transition-all min-h-[48px]
                      ${isSelected
                        ? 'bg-primary-600 text-white shadow-warm'
                        : isDayToday
                          ? 'bg-primary-100 text-primary-800'
                          : 'hover:bg-primary-50'
                      }
                      ${!isCurrentMonthDay ? 'opacity-30' : ''}
                      ${isPast && !isDayToday && !isSelected && isCurrentMonthDay ? 'opacity-50' : ''}
                    `}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-primary-800'}`}>
                      {format(day, 'd')}
                    </span>
                    {/* Session indicators */}
                    <div className="flex gap-0.5 mt-0.5 h-1.5">
                      {hasSession ? (
                        daySessions.slice(0, 3).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-primary-200' : 'bg-primary-500'
                            }`}
                          />
                        ))
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
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
              {isBefore(selectedDate, startOfDay(new Date()))
                ? 'Aucune séance ce jour-là'
                : 'Aucune séance prévue'}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateSessions.map(session => {
                const sessionIsPast = isBefore(parseISO(session.endTime), new Date())
                return (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onRefresh={handleRefresh}
                    bansReceived={bansReceived}
                    compact
                    isAdmin={isAdmin}
                    isPast={sessionIsPast}
                  />
                )
              })}
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
