import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useGroupsStore } from '../stores/groups'

export function CreateGroupPage() {
  const navigate = useNavigate()
  const { createGroup } = useGroupsStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const group = await createGroup(name)
      navigate(`/groups/${group.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <Link
        to="/"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </Link>

      <h1 className="text-2xl font-bold mb-6">Créer un groupe</h1>

      <form onSubmit={handleSubmit} className="card p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nom du groupe
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Les Musclés du Midi"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name}
          className="w-full btn-primary"
        >
          {loading ? 'Création...' : 'Créer le groupe'}
        </button>
      </form>
    </div>
  )
}
