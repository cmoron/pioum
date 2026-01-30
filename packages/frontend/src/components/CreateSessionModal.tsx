import { useState } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Europe/Paris'

interface CreateSessionModalProps {
  groupId: string
  onClose: () => void
  onCreated: () => void
}

export function CreateSessionModal({ groupId, onClose, onCreated }: CreateSessionModalProps) {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const [date, setDate] = useState(tomorrow)
  const [startTime, setStartTime] = useState('12:00')
  const [endTime, setEndTime] = useState('14:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!date) {
      setError('La date est requise')
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

    // Check date is not in the past
    const selectedDate = parseISO(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      setError('La date ne peut pas être dans le passé')
      return
    }

    setLoading(true)

    try {
      // Parse time components
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)

      // Create dates in Paris timezone and convert to UTC
      const startDate = new Date(date)
      startDate.setHours(startHour, startMin, 0, 0)
      const startDateTimeUTC = fromZonedTime(startDate, TIMEZONE)

      const endDate = new Date(date)
      endDate.setHours(endHour, endMin, 0, 0)
      const endDateTimeUTC = fromZonedTime(endDate, TIMEZONE)

      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          date,
          startTime: startDateTimeUTC.toISOString(),
          endTime: endDateTimeUTC.toISOString()
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }

      onCreated()
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
        <h2 className="text-xl font-bold mb-4 text-primary-800">Nouvelle séance</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary-800 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="input w-full"
              required
            />
          </div>

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

          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
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
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
