import { useState, useEffect } from 'react'
import { Group, Avatar as AvatarType, api } from '../lib/api'

interface GroupSettingsModalProps {
  group: Group
  onSave: (data: { name?: string; avatarId?: string | null }) => void
  onClose: () => void
}

export function GroupSettingsModal({ group, onSave, onClose }: GroupSettingsModalProps) {
  const [name, setName] = useState(group.name)
  const [avatarId, setAvatarId] = useState<string | null>(group.avatarId || null)
  const [avatars, setAvatars] = useState<AvatarType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getAvatars().then(({ avatars }) => {
      const groupAvatars = avatars.filter((a) => a.category === 'groups')
      setAvatars(groupAvatars)
    })
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Le nom du groupe est requis')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data: { name?: string; avatarId?: string | null } = {}
      if (name !== group.name) data.name = name
      if (avatarId !== group.avatarId) data.avatarId = avatarId

      if (Object.keys(data).length > 0) {
        await onSave(data)
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Paramètres du groupe</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du groupe
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Nom du groupe"
            maxLength={100}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Avatar du groupe
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setAvatarId(avatar.id)}
                className={`aspect-square flex items-center justify-center text-3xl rounded-lg border-2 transition-all ${
                  avatarId === avatar.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {avatar.imageUrl}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAvatarId(null)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Supprimer l'avatar
          </button>
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
            onClick={handleSave}
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
