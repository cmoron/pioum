import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth'
import { useUserCarsStore } from '../stores/userCars'
import { api, Avatar as AvatarType, UserCar } from '../lib/api'
import { isImageUrl } from '../lib/utils'
import { Avatar } from '../components/Avatar'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { UserCarCard } from '../components/UserCarCard'

export function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore()
  const { userCars, fetchUserCars, deleteUserCar } = useUserCarsStore()
  const [name, setName] = useState(user?.name || '')
  const [avatars, setAvatars] = useState<AvatarType[]>([])
  const [carAvatars, setCarAvatars] = useState<AvatarType[]>([])
  const [selectedAvatarId, setSelectedAvatarId] = useState(user?.avatarId || null)
  const [loading, setLoading] = useState(false)
  const [loadingAvatars, setLoadingAvatars] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // User car modal state
  const [showCarModal, setShowCarModal] = useState(false)
  const [editingCar, setEditingCar] = useState<UserCar | null>(null)
  const [carName, setCarName] = useState('')
  const [carAvatarId, setCarAvatarId] = useState('')
  const [carSeats, setCarSeats] = useState(3)
  const [savingCar, setSavingCar] = useState(false)

  useEffect(() => {
    api.getAvatars()
      .then(({ avatars }) => {
        // Filtrer par catégorie
        setAvatars(avatars.filter(a => a.category === 'users'))
        setCarAvatars(avatars.filter(a => a.category === 'cars'))
      })
      .finally(() => setLoadingAvatars(false))
    fetchUserCars()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { user: updatedUser } = await api.updateProfile({
        name,
        avatarId: selectedAvatarId
      })
      updateUser(updatedUser)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleOpenCarModal = (car?: UserCar) => {
    if (car) {
      setEditingCar(car)
      setCarName(car.name || '')
      setCarAvatarId(car.avatarId)
      setCarSeats(car.defaultSeats)
    } else {
      setEditingCar(null)
      setCarName('')
      setCarAvatarId(carAvatars[0]?.id || '')
      setCarSeats(3)
    }
    setShowCarModal(true)
  }

  const handleSaveCar = async () => {
    if (!carAvatarId) return

    setSavingCar(true)
    try {
      if (editingCar) {
        await api.updateUserCar(editingCar.id, {
          name: carName || null,
          avatarId: carAvatarId,
          defaultSeats: carSeats
        })
      } else {
        await api.createUserCar({
          name: carName || undefined,
          avatarId: carAvatarId,
          defaultSeats: carSeats
        })
      }
      await fetchUserCars()
      setShowCarModal(false)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setSavingCar(false)
    }
  }

  const handleDeleteCar = async (id: string) => {
    try {
      await deleteUserCar(id)
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (!user) return null

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-primary-800">Mon profil</h1>

      <div className="card p-6 mb-6">
        {/* Current avatar preview */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar
            user={{
              ...user,
              avatar: avatars.find(a => a.id === selectedAvatarId) || user.avatar
            }}
            size="xl"
          />
          <div>
            <p className="font-medium text-primary-800">{user.name}</p>
            <p className="text-sm text-primary-600">{user.email}</p>
          </div>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-primary-800 mb-2">
            Nom
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>

        {/* Avatar selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-primary-800 mb-2">
            Avatar
          </label>
          {loadingAvatars ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatarId(avatar.id)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-primary-100 ring-2 transition-all overflow-hidden ${
                    selectedAvatarId === avatar.id
                      ? 'ring-primary-700 ring-offset-2 shadow-warm'
                      : 'ring-transparent hover:ring-primary-300'
                  }`}
                  title={avatar.name}
                >
                  {isImageUrl(avatar.imageUrl) ? (
                    <img
                      src={avatar.imageUrl}
                      alt={avatar.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    avatar.imageUrl
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {success && (
          <p className="text-sm text-green-600 mb-4">Profil mis à jour !</p>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full btn-primary"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* My cars section */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary-800">Mes voitures</h2>
          <button
            onClick={() => handleOpenCarModal()}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </button>
        </div>

        {userCars.length === 0 ? (
          <p className="text-primary-600 text-center py-8">
            Aucune voiture enregistrée. Ajoutez-en une pour aller plus vite lors de l'ajout à une session.
          </p>
        ) : (
          <div className="space-y-3">
            {userCars.map((car) => (
              <UserCarCard
                key={car.id}
                userCar={car}
                onEdit={handleOpenCarModal}
                onDelete={handleDeleteCar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full btn-secondary text-red-600"
      >
        Déconnexion
      </button>

      {/* Car modal */}
      {showCarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-warm p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-warm-xl border-2 border-primary-300">
            <h2 className="text-xl font-bold mb-4 text-primary-800">
              {editingCar ? 'Modifier la voiture' : 'Nouvelle voiture'}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Nom (optionnel)
              </label>
              <input
                type="text"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                placeholder="Ma Clio"
                className="input"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Type de voiture
              </label>
              {loadingAvatars ? (
                <LoadingSpinner />
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {carAvatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setCarAvatarId(avatar.id)}
                      className={`p-3 rounded-warm border-2 transition-all ${
                        carAvatarId === avatar.id
                          ? 'border-primary-700 bg-primary-100 shadow-warm'
                          : 'border-primary-300 hover:border-primary-400'
                      }`}
                    >
                      <div className="text-4xl mb-2 flex justify-center">
                        {isImageUrl(avatar.imageUrl) ? (
                          <img src={avatar.imageUrl} alt={avatar.name} className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          avatar.imageUrl
                        )}
                      </div>
                      <div className="text-sm text-center font-medium text-primary-800">{avatar.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-primary-800 mb-2">
                Places par défaut
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCarSeats(Math.max(1, carSeats - 1))}
                  className="w-10 h-10 rounded-full bg-primary-200 hover:bg-primary-300 flex items-center justify-center text-lg font-bold text-primary-800 transition-colors"
                >
                  -
                </button>
                <span className="text-3xl font-bold text-primary-800">{carSeats}</span>
                <button
                  onClick={() => setCarSeats(Math.min(8, carSeats + 1))}
                  className="w-10 h-10 rounded-full bg-primary-200 hover:bg-primary-300 flex items-center justify-center text-lg font-bold text-primary-800 transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-primary-600 text-center mt-2">
                {carSeats} place{carSeats > 1 ? 's' : ''} (hors toi)
              </p>
            </div>

            <button
              onClick={handleSaveCar}
              disabled={savingCar || !carAvatarId}
              className="w-full btn-primary mb-2"
            >
              {savingCar ? 'Enregistrement...' : editingCar ? 'Modifier' : 'Créer'}
            </button>
            <button
              onClick={() => setShowCarModal(false)}
              className="w-full btn-ghost"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
