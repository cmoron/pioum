import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useGroupsStore } from '../stores/groups'

export function JoinGroupPage() {
  const navigate = useNavigate()
  const { joinGroup } = useGroupsStore()
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const group = await joinGroup(inviteCode.trim())
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
        className="flex items-center gap-2 text-primary-600 hover:text-primary-800 mb-4 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </Link>

      <h1 className="text-2xl font-bold mb-6 text-primary-800">Rejoindre un groupe</h1>

      <form onSubmit={handleSubmit} className="card p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-primary-800 mb-2">
            Code d'invitation
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="input text-center font-mono text-xl tracking-wider"
            placeholder="ABC12345"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !inviteCode}
          className="w-full btn-primary"
        >
          {loading ? 'Connexion...' : 'Rejoindre'}
        </button>
      </form>
    </div>
  )
}
