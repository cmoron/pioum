import { UserCar } from '../lib/api'
import { useState } from 'react'

interface UserCarCardProps {
  userCar: UserCar
  onEdit: (userCar: UserCar) => void
  onDelete: (id: string) => void
}

export function UserCarCard({ userCar, onEdit, onDelete }: UserCarCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleDelete = () => {
    if (confirm(`Supprimer "${userCar.name || 'cette voiture'}" ?`)) {
      onDelete(userCar.id)
    }
  }

  return (
    <div className="card p-4 relative">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl">
          {userCar.avatar.imageUrl.startsWith('http') ? (
            <img src={userCar.avatar.imageUrl} alt={userCar.avatar.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            <span>{userCar.avatar.imageUrl}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <p className="font-medium text-lg">
            {userCar.name || userCar.avatar.name}
          </p>
          <p className="text-sm text-gray-500">
            {userCar.defaultSeats} place{userCar.defaultSeats > 1 ? 's' : ''} par défaut
          </p>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => {
                    onEdit(userCar)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => {
                    handleDelete()
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600"
                >
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
