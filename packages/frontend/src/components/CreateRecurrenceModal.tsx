import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { api } from '../lib/api'

interface CreateRecurrenceModalProps {
  groupId: string
  onClose: () => void
  onCreated: () => void
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' }
]

export function CreateRecurrenceModal({ groupId, onClose, onCreated }: CreateRecurrenceModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const threeMonthsLater = format(addDays(new Date(), 90), 'yyyy-MM-dd')

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri by default
  const [startTime, setStartTime] = useState('12:00')
  const [endTime, setEndTime] = useState('14:00')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(threeMonthsLater)
  const [hasEndDate, setHasEndDate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ sessionsCreated: number } | null>(null)

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validation
    if (selectedDays.length === 0) {
      setError('Sélectionne au moins un jour')
      return
    }

    if (!startTime || !endTime) {
      setError('Les horaires sont requis')
      return
    }

    if (startTime >= endTime) {
      setError('L\'heure de fin doit être après l\'heure de début')
      return
    }

    if (!startDate) {
      setError('La date de début est requise')
      return
    }

    if (hasEndDate && endDate && endDate < startDate) {
      setError('La date de fin doit être après la date de début')
      return
    }

    setLoading(true)

    try {
      const result = await api.createRecurrencePattern(groupId, {
        startTime,
        endTime,
        daysOfWeek: selectedDays,
        startDate,
        endDate: hasEndDate ? endDate : undefined
      })

      setSuccess({ sessionsCreated: result.sessionsCreated })

      // Wait a moment to show success, then close
      setTimeout(() => {
        onCreated()
        onClose()
      }, 1500)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-primary-800">Récurrence</h2>
        <p className="text-sm text-primary-600 mb-4">
          Crée des séances automatiques sur plusieurs semaines
        </p>

        <form onSubmit={handleSubmit}>
          {/* Days of week */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary-800 mb-2">
              Jours
            </label>
            <div className="flex gap-1">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`flex-1 py-2 px-1 text-sm rounded-warm border-2 transition-colors ${
                    selectedDays.includes(day.value)
                      ? 'bg-primary-500 text-white border-primary-600'
                      : 'bg-white text-primary-700 border-primary-200 hover:border-primary-400'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Début
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Fin
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input w-full"
                required
              />
            </div>
          </div>

          {/* Start date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary-800 mb-2">
              À partir du
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              className="input w-full"
              required
            />
          </div>

          {/* End date */}
          <div className="mb-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                className="rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-primary-800">Date de fin</span>
            </label>
            {hasEndDate && (
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="input w-full"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600 mb-4">
              {success.sessionsCreated} séance{success.sessionsCreated > 1 ? 's' : ''} créée{success.sessionsCreated > 1 ? 's' : ''}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || success !== null}
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
