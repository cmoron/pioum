import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSessionStore } from '../stores/session'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { CarCard } from '../components/CarCard'

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { session, fetchSession, loading } = useSessionStore()

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId)
    }
  }, [sessionId, fetchSession])

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <Link
        to={`/groups/${session.groupId}`}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour au groupe
      </Link>

      <h1 className="text-2xl font-bold mb-6">Session</h1>

      {session.cars.length > 0 ? (
        <div className="space-y-3">
          {session.cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">
          Pas encore de voitures pour cette session
        </p>
      )}
    </div>
  )
}
