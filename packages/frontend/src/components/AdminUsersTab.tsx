import { useEffect, useState } from 'react'
import { AdminUser, Avatar as AvatarType, api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { Avatar } from './Avatar'

export function AdminUsersTab() {
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [avatars, setAvatars] = useState<AvatarType[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminUser | null>(null)

  const load = async (search = q) => {
    try {
      setLoading(true)
      const { users } = await api.adminGetUsers(search || undefined)
      setUsers(users)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('')
    api
      .getAvatars()
      .then(({ avatars }) => setAvatars(avatars.filter((a) => a.category === 'users')))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (u: AdminUser) => {
    if (!window.confirm(`Supprimer ${u.name} et toutes ses données ?`)) return
    setError(null)
    try {
      await api.adminDeleteUser(u.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
        className="flex gap-2 mb-4"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom ou email"
          className="input flex-1"
        />
        <button type="submit" className="btn-secondary">
          Rechercher
        </button>
      </form>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-primary-600">Chargement...</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-warm p-3 shadow-warm border-2 border-primary-200 flex items-center gap-3"
            >
              <Avatar user={u} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-800 truncate">
                  {u.name}
                  {u.role === 'admin' && (
                    <span className="ml-2 text-xs bg-primary-700 text-white px-2 py-0.5 rounded-full">
                      admin
                    </span>
                  )}
                </p>
                <p className="text-sm text-primary-500 truncate">{u.email || '—'}</p>
                <p className="text-xs text-primary-400">{u._count?.memberships ?? 0} groupe(s)</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(u)} className="btn-secondary text-xs py-1 px-2">
                  Éditer
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="btn-danger text-xs py-1 px-2 disabled:opacity-40"
                  disabled={u.id === currentUser?.id}
                  title={u.id === currentUser?.id ? 'Vous ne pouvez pas vous supprimer' : undefined}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditUserModal
          user={editing}
          avatars={avatars}
          isSelf={editing.id === currentUser?.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

interface EditUserModalProps {
  user: AdminUser
  avatars: AvatarType[]
  isSelf: boolean
  onClose: () => void
  onSaved: () => void
}

function EditUserModal({ user, avatars, isSelf, onClose, onSaved }: EditUserModalProps) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email ?? '')
  const [avatarId, setAvatarId] = useState(user.avatarId ?? '')
  const [role, setRole] = useState<'user' | 'admin'>(user.role === 'admin' ? 'admin' : 'user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.adminUpdateUser(user.id, {
        name,
        email: email.trim() === '' ? null : email.trim(),
        avatarId: avatarId === '' ? null : avatarId,
        role,
      })
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300 space-y-3">
        <h2 className="text-xl font-bold text-primary-800">Éditer {user.name}</h2>

        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={50} />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="—"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">Avatar</label>
          <select value={avatarId} onChange={(e) => setAvatarId(e.target.value)} className="input">
            <option value="">Aucun</option>
            {avatars.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
            className="input disabled:opacity-50"
            disabled={isSelf}
            title={isSelf ? 'Vous ne pouvez pas changer votre propre rôle' : undefined}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
            Annuler
          </button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
