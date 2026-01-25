import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function VerifyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { verifyMagicLink } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('Lien invalide')
      return
    }

    verifyMagicLink(token)
      .then(() => {
        navigate('/', { replace: true })
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [searchParams, verifyMagicLink, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {error ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/login" className="btn-primary">
            Retour à la connexion
          </a>
        </div>
      ) : (
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Vérification en cours...</p>
        </div>
      )}
    </div>
  )
}
