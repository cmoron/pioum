import { useState, useEffect } from 'react'
import { UserCar, Avatar as AvatarType } from '../lib/api'
import { isImageUrl } from '../lib/utils'
import { useUserCarsStore } from '../stores/userCars'
import { api } from '../lib/api'
import { LoadingSpinner } from './LoadingSpinner'

interface UserCarSelectorProps {
  onSelect: (userCarId: string | null, seats: number) => void
  onClose: () => void
}

export function UserCarSelector({ onSelect, onClose }: UserCarSelectorProps) {
  const { userCars, fetchUserCars, loading } = useUserCarsStore()
  const [selectedCar, setSelectedCar] = useState<UserCar | null>(null)
  const [seats, setSeats] = useState(3)
  const [showNewCar, setShowNewCar] = useState(false)

  // New car form state
  const [newCarName, setNewCarName] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('')
  const [avatars, setAvatars] = useState<AvatarType[]>([])
  const [loadingAvatars, setLoadingAvatars] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchUserCars()
    api.getAvatars()
      .then(({ avatars }) => {
        const carAvatars = avatars.filter(a => a.category === 'cars')
        setAvatars(carAvatars)
        if (carAvatars.length > 0) {
          setSelectedAvatarId(carAvatars[0].id)
        }
      })
      .finally(() => setLoadingAvatars(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectExisting = (car: UserCar) => {
    setSelectedCar(car)
    setSeats(car.defaultSeats)
  }

  const handleCreateAndSelect = async () => {
    if (!selectedAvatarId) return

    setCreating(true)
    try {
      const { userCar } = await api.createUserCar({
        name: newCarName || undefined,
        avatarId: selectedAvatarId,
        defaultSeats: seats
      })
      await fetchUserCars()
      onSelect(userCar.id, userCar.defaultSeats)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleSubmit = () => {
    if (selectedCar) {
      onSelect(selectedCar.id, seats)
    } else {
      onSelect(null, seats)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Choisir une voiture</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : showNewCar ? (
          /* New car form */
          <div>
            <button
              onClick={() => setShowNewCar(false)}
              className="text-sm text-gray-500 mb-4 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la voiture (optionnel)
              </label>
              <input
                type="text"
                value={newCarName}
                onChange={(e) => setNewCarName(e.target.value)}
                placeholder="Ma Clio"
                className="input"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de voiture
              </label>
              {loadingAvatars ? (
                <LoadingSpinner />
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedAvatarId === avatar.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-4xl mb-1 flex justify-center">
                        {isImageUrl(avatar.imageUrl) ? (
                          <img src={avatar.imageUrl} alt={avatar.name} className="w-14 h-14 object-cover rounded-lg" />
                        ) : (
                          avatar.imageUrl
                        )}
                      </div>
                      <div className="text-xs text-center">{avatar.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Places disponibles
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold"
                >
                  -
                </button>
                <span className="text-3xl font-bold">{seats}</span>
                <button
                  onClick={() => setSeats(Math.min(8, seats + 1))}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">
                {seats} place{seats > 1 ? 's' : ''} (hors toi)
              </p>
            </div>

            <button
              onClick={handleCreateAndSelect}
              disabled={creating || !selectedAvatarId}
              className="w-full btn-primary mb-2"
            >
              {creating ? 'Création...' : 'Créer et utiliser'}
            </button>
            <button
              onClick={onClose}
              className="w-full btn-ghost"
            >
              Annuler
            </button>
          </div>
        ) : (
          /* Car selection */
          <div>
            {userCars.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-3">Mes voitures enregistrées</p>
                <div className="space-y-2">
                  {userCars.map((car) => (
                    <button
                      key={car.id}
                      onClick={() => handleSelectExisting(car)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedCar?.id === car.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl">
                          {isImageUrl(car.avatar.imageUrl) ? (
                            <img src={car.avatar.imageUrl} alt={car.avatar.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span>{car.avatar.imageUrl}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{car.name || car.avatar.name}</p>
                          <p className="text-sm text-gray-500">
                            {car.defaultSeats} place{car.defaultSeats > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowNewCar(true)}
              className="w-full btn-secondary mb-4 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle voiture
            </button>

            {selectedCar && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Places pour cette session
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setSeats(Math.max(1, seats - 1))}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg font-bold"
                  >
                    -
                  </button>
                  <span className="text-3xl font-bold">{seats}</span>
                  <button
                    onClick={() => setSeats(Math.min(8, seats + 1))}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {!selectedCar && userCars.length === 0 && (
              <p className="text-sm text-gray-500 text-center mb-4">
                Aucune voiture enregistrée. Créez-en une nouvelle.
              </p>
            )}

            {selectedCar && (
              <>
                <button
                  onClick={handleSubmit}
                  className="w-full btn-primary mb-2"
                >
                  Ajouter cette voiture
                </button>
                <button
                  onClick={onClose}
                  className="w-full btn-ghost"
                >
                  Annuler
                </button>
              </>
            )}

            {!selectedCar && userCars.length > 0 && (
              <button
                onClick={onClose}
                className="w-full btn-ghost"
              >
                Annuler
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
