import { useEffect, useState } from 'react'
import { AdminAvatar, api } from '../lib/api'

const CATEGORIES = ['users', 'cars', 'groups'] as const

function usageTotal(a: AdminAvatar): number {
  if (!a._count) return 0
  return a._count.users + a._count.userCars + a._count.groups
}

export function AdminAvatarsTab() {
  const [avatars, setAvatars] = useState<AdminAvatar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('users')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const { avatars } = await api.adminGetAvatars()
      setAvatars(avatars)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      await api.adminCreateAvatar({ name, category, image: file })
      setName('')
      setFile(null)
      ;(e.target as HTMLFormElement).reset()
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (a: AdminAvatar) => {
    if (!window.confirm(`Supprimer l'avatar "${a.name}" ?`)) return
    setError(null)
    try {
      await api.adminDeleteAvatar(a.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div>
      <form
        onSubmit={handleUpload}
        className="bg-white rounded-warm p-4 shadow-warm border-2 border-primary-200 mb-6 space-y-3"
      >
        <h3 className="font-bold text-primary-800">Ajouter un avatar</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className="input"
            required
            maxLength={50}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/webp,image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={saving || !file}>
          {saving ? 'Envoi...' : 'Ajouter'}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-primary-600">Chargement...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {avatars.map((a) => {
            const used = usageTotal(a)
            return (
              <div
                key={a.id}
                className="bg-white rounded-warm p-3 shadow-warm border-2 border-primary-200 flex flex-col items-center gap-2"
              >
                <img
                  src={a.imageUrl}
                  alt={a.name}
                  className="w-16 h-16 rounded-full object-cover bg-primary-100"
                />
                <p className="text-sm font-medium text-primary-800 text-center truncate w-full">
                  {a.name}
                </p>
                <span className="text-xs text-primary-500">{a.category}</span>
                <span className="text-xs text-primary-400">
                  {used > 0 ? `Utilisé ×${used}` : 'Non utilisé'}
                </span>
                <button
                  onClick={() => handleDelete(a)}
                  className="btn-danger text-xs py-1 px-2 w-full disabled:opacity-40"
                  disabled={used > 0}
                  title={used > 0 ? 'Réassignez les usages avant de supprimer' : undefined}
                >
                  Supprimer
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
