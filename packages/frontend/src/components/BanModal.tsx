import { useState } from 'react'
import { Ban, User, api } from '../lib/api'
import { Avatar } from './Avatar'

interface BanModalProps {
  user: User
  onClose: () => void
  onBanned?: (ban: Ban) => void
}

const durations = [
  { value: '1d', label: '1 jour' },
  { value: '3d', label: '3 jours' },
  { value: '1w', label: '1 semaine' },
  { value: '2w', label: '2 semaines' }
]

export function BanModal({ user, onClose, onBanned }: BanModalProps) {
  const [duration, setDuration] = useState('1d')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBan = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.createBan(user.id, duration, reason || undefined)
      onBanned?.(result.ban)
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
        <h2 className="text-xl font-bold mb-4 text-primary-800">Bannir un passager</h2>

        <div className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-warm border border-primary-200">
          <Avatar user={user} size="md" />
          <div>
            <p className="font-medium text-primary-800">{user.name}</p>
            <p className="text-sm text-primary-600">Sera banni de ta voiture</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-primary-800 mb-2">
            Durée du ban
          </label>
          <div className="grid grid-cols-2 gap-2">
            {durations.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={`px-3 py-2 rounded-warm text-sm font-medium transition-all ${
                  duration === d.value
                    ? 'bg-primary-700 text-white shadow-warm'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-primary-800 mb-2">
            Raison (optionnel)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="T'as pété dans ma voiture..."
            className="input"
            maxLength={200}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleBan}
            className="btn-danger flex-1"
            disabled={loading}
          >
            {loading ? 'Bannissement...' : 'Bannir'}
          </button>
        </div>
      </div>
    </div>
  )
}
