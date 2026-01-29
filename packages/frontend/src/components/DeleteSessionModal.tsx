import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Session, api } from '../lib/api'

interface DeleteSessionModalProps {
  session: Session
  onClose: () => void
  onDeleted: () => void
}

export function DeleteSessionModal({ session, onClose, onDeleted }: DeleteSessionModalProps) {
  const sessionDate = parseISO(session.date)
  const [scope, setScope] = useState<'single' | 'future' | 'all'>('single')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRecurring = !!session.recurrencePatternId

  const handleDelete = async () => {
    setError(null)
    setLoading(true)

    try {
      await api.cancelSession(session.id, isRecurring ? scope : undefined)
      onDeleted()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Simple confirmation for non-recurring sessions
  if (!isRecurring) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300">
          <h2 className="text-xl font-bold mb-2 text-primary-800">Supprimer la séance ?</h2>
          <p className="text-sm text-primary-600 mb-4 capitalize">
            {format(sessionDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </p>

          {session.passengers.length > 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-warm mb-4">
              Cette séance a {session.passengers.length} participant{session.passengers.length > 1 ? 's' : ''}.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded-warm mb-4">{error}</p>
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
              onClick={handleDelete}
              className="btn-danger flex-1"
              disabled={loading}
            >
              {loading ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Scope selection for recurring sessions
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300">
        <h2 className="text-xl font-bold mb-2 text-primary-800">Supprimer la séance</h2>
        <p className="text-sm text-primary-600 mb-4 capitalize">
          {format(sessionDate, 'EEEE d MMMM yyyy', { locale: fr })}
        </p>

        <p className="text-sm font-medium text-primary-700 mb-2">
          Cette séance fait partie d'une récurrence
        </p>

        <div className="space-y-2 mb-4">
          <label className="flex items-start gap-2 p-3 rounded-warm border-2 border-primary-200 cursor-pointer hover:bg-primary-50 transition-colors">
            <input
              type="radio"
              name="scope"
              value="single"
              checked={scope === 'single'}
              onChange={() => setScope('single')}
              className="mt-0.5 text-primary-600"
            />
            <div>
              <span className="font-medium text-primary-800">Cette séance uniquement</span>
              <p className="text-xs text-primary-500">Supprime uniquement cette séance</p>
            </div>
          </label>

          <label className="flex items-start gap-2 p-3 rounded-warm border-2 border-primary-200 cursor-pointer hover:bg-primary-50 transition-colors">
            <input
              type="radio"
              name="scope"
              value="future"
              checked={scope === 'future'}
              onChange={() => setScope('future')}
              className="mt-0.5 text-primary-600"
            />
            <div>
              <span className="font-medium text-primary-800">Cette séance et les suivantes</span>
              <p className="text-xs text-primary-500">Supprime toutes les séances à partir de celle-ci</p>
            </div>
          </label>

          <label className="flex items-start gap-2 p-3 rounded-warm border-2 border-red-200 cursor-pointer hover:bg-red-50 transition-colors">
            <input
              type="radio"
              name="scope"
              value="all"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
              className="mt-0.5 text-red-600"
            />
            <div>
              <span className="font-medium text-red-700">Toute la récurrence</span>
              <p className="text-xs text-red-500">Supprime toutes les séances et la récurrence elle-même</p>
            </div>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded-warm mb-4">{error}</p>
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
            onClick={handleDelete}
            className="btn-danger flex-1"
            disabled={loading}
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}
