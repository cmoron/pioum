import { useState, useEffect } from 'react'
import { Group, Avatar as AvatarType, api } from '../lib/api'
import { isImageUrl } from '../lib/utils'

interface GroupSettingsModalProps {
  group: Group
  onSave: (data: { name?: string; avatarId?: string | null }) => void
  onDelete: () => void
  onClose: () => void
}

export function GroupSettingsModal({ group, onSave, onDelete, onClose }: GroupSettingsModalProps) {
  const [name, setName] = useState(group.name)
  const [avatarId, setAvatarId] = useState<string | null>(group.avatarId || null)
  const [avatars, setAvatars] = useState<AvatarType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        onSave(data)
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      onDelete()
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-warm p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-warm-xl border-2 border-primary-300">
        <h2 className="text-xl font-bold mb-4 text-primary-800">Paramètres du groupe</h2>

        {showDeleteConfirm ? (
          // Confirmation de suppression
          <div>
            <div className="bg-red-50 border-2 border-red-200 rounded-warm p-4 mb-4">
              <p className="text-red-800 font-medium mb-2">Supprimer ce groupe ?</p>
              <p className="text-red-600 text-sm">
                Cette action est irréversible. Toutes les sessions et données du groupe seront supprimées.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded-warm font-medium hover:bg-red-600 transition-all shadow-warm hover:shadow-warm-md flex-1"
                disabled={deleting}
              >
                {deleting ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        ) : (
          // Formulaire normal
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary-800 mb-2">
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
              <label className="block text-sm font-medium text-primary-800 mb-3">
                Avatar du groupe
              </label>
              <div className="grid grid-cols-3 gap-3 mb-2">
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setAvatarId(avatar.id)}
                    className={`aspect-square flex items-center justify-center text-4xl rounded-warm border-2 transition-all overflow-hidden ${
                      avatarId === avatar.id
                        ? 'border-primary-700 bg-primary-100 shadow-warm'
                        : 'border-primary-300 hover:border-primary-400'
                    }`}
                  >
                    {isImageUrl(avatar.imageUrl) ? (
                      <img src={avatar.imageUrl} alt={avatar.name} className="w-full h-full object-cover" />
                    ) : (
                      avatar.imageUrl
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAvatarId(null)}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Supprimer l'avatar
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            <div className="flex gap-2 mb-4">
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

            {/* Zone danger */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Supprimer ce groupe
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
