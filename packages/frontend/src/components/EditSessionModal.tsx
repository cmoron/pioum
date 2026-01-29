import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Session, api } from '../lib/api'

interface EditSessionModalProps {
  session: Session
  onClose: () => void
  onUpdated: () => void
}

export function EditSessionModal({ session, onClose, onUpdated }: EditSessionModalProps) {
  const sessionDate = parseISO(session.date)
  const currentStart = parseISO(session.startTime)
  const currentEnd = parseISO(session.endTime)

  const [startTime, setStartTime] = useState(format(currentStart, 'HH:mm'))
  const [endTime, setEndTime] = useState(format(currentEnd, 'HH:mm'))
  const [scope, setScope] = useState<'single' | 'future'>('single')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRecurring = !!session.recurrencePatternId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Create full datetime from date + time
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const newStartTime = new Date(sessionDate)
    newStartTime.setHours(startHour, startMin, 0, 0)

    const newEndTime = new Date(sessionDate)
    newEndTime.setHours(endHour, endMin, 0, 0)

    if (newEndTime <= newStartTime) {
      setError("L'heure de fin doit être après l'heure de début")
      return
    }

    setLoading(true)
    try {
      await api.updateSession(session.id, {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        scope: isRecurring ? scope : undefined
      })
      onUpdated()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300">
        <h2 className="text-xl font-bold mb-4 text-primary-800">Modifier la séance</h2>

        <p className="text-sm text-primary-600 mb-4 capitalize">
          {format(sessionDate, 'EEEE d MMMM yyyy', { locale: fr })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Début
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Fin
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {/* Scope selection for recurring sessions */}
          {isRecurring && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary-700">
                Cette séance fait partie d'une récurrence
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 rounded-warm border-2 border-primary-200 cursor-pointer hover:bg-primary-50 transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="single"
                    checked={scope === 'single'}
                    onChange={() => setScope('single')}
                    className="text-primary-600"
                  />
                  <div>
                    <span className="font-medium text-primary-800">Cette séance uniquement</span>
                    <p className="text-xs text-primary-500">Détache cette séance de la récurrence</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-warm border-2 border-primary-200 cursor-pointer hover:bg-primary-50 transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="future"
                    checked={scope === 'future'}
                    onChange={() => setScope('future')}
                    className="text-primary-600"
                  />
                  <div>
                    <span className="font-medium text-primary-800">Toutes les futures</span>
                    <p className="text-xs text-primary-500">Met à jour la récurrence et toutes les séances à venir</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded-warm">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
