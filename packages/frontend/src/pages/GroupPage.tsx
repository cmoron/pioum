import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGroupsStore } from '../stores/groups'
import { useSessionStore } from '../stores/session'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { isImageUrl } from '../lib/utils'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Avatar } from '../components/Avatar'
import { CarCard } from '../components/CarCard'
import { UserCarSelector } from '../components/UserCarSelector'
import { GroupSettingsModal } from '../components/GroupSettingsModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { currentGroup, currentUserRole, fetchGroup, updateGroup, deleteGroup, loading: groupLoading, error: groupError } = useGroupsStore()
  const navigate = useNavigate()
  const { session, fetchTodaySession, joinSession, leaveSession, addCar, loading: sessionLoading } = useSessionStore()
  const { user } = useAuthStore()
  const [showInvite, setShowInvite] = useState(false)
  const [showCarSelector, setShowCarSelector] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [bansReceived, setBansReceived] = useState<string[]>([])

  // Fetch bans to know which cars user is banned from
  useEffect(() => {
    api.getActiveBans().then(({ bansReceived }) => {
      setBansReceived(bansReceived.map((b) => b.giverId))
    })
  }, [])

  useEffect(() => {
    if (groupId) {
      fetchGroup(groupId)
      fetchTodaySession(groupId)
    }
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling for real-time updates
  const refresh = useCallback(() => {
    if (groupId) {
      fetchTodaySession(groupId)
    }
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(refresh, 10000) // Poll every 10 seconds
    return () => clearInterval(interval)
  }, [refresh])

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (groupError || !currentGroup) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-500 mb-4">{groupError || 'Groupe non trouvé'}</p>
        <a href="/" className="btn-primary">Retour à l'accueil</a>
      </div>
    )
  }

  const isParticipating = session?.passengers.some((p) => p.userId === user?.id)
  const myCar = session?.cars.find((c) => c.driverId === user?.id)
  const participantsWithoutCar = session?.passengers.filter(
    (p) => !p.carId && !session.cars.some((c) => c.driverId === p.userId)
  )

  const handleJoinSession = async () => {
    await joinSession()
  }

  const handleLeaveSession = async () => {
    await leaveSession()
  }

  const handleCarSelected = async (userCarId: string | null, seats: number) => {
    await addCar(seats, userCarId || undefined)
    setShowCarSelector(false)
  }

  const handleUpdateGroup = async (data: { name?: string; avatarId?: string | null }) => {
    if (!currentGroup) return
    await updateGroup(currentGroup.id, data)
  }

  const handleDeleteGroup = async () => {
    if (!currentGroup) return
    await deleteGroup(currentGroup.id)
    navigate('/')
  }

  const isAdmin = currentUserRole === 'admin'

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {currentGroup.avatar && (
            <div className="w-20 h-20 flex items-center justify-center text-5xl bg-primary-50 rounded-full overflow-hidden">
              {isImageUrl(currentGroup.avatar.imageUrl) ? (
                <img src={currentGroup.avatar.imageUrl} alt={currentGroup.avatar.name} className="w-full h-full object-cover" />
              ) : (
                currentGroup.avatar.imageUrl
              )}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{currentGroup.name}</h1>
            <p className="text-gray-500">
              {format(new Date(), 'EEEE d MMMM', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
              title="Paramètres du groupe"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowInvite(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Inviter des potes"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Participation toggle */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {isParticipating ? 'Tu participes !' : 'Tu viens à la muscu ?'}
            </p>
            <p className="text-sm text-gray-500">
              {session?.passengers.length || 0} participant{(session?.passengers.length || 0) > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={isParticipating ? handleLeaveSession : handleJoinSession}
            disabled={sessionLoading}
            className={isParticipating ? 'btn-secondary' : 'btn-primary'}
          >
            {isParticipating ? 'Je ne viens plus' : 'Je viens !'}
          </button>
        </div>
      </div>

      {/* Participants without car */}
      {participantsWithoutCar && participantsWithoutCar.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-medium mb-2">En attente de voiture</h2>
          <div className="flex flex-wrap gap-3">
            {participantsWithoutCar.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-gray-50 rounded-full pl-1 pr-4 py-1.5"
              >
                <Avatar user={p.user} size="md" />
                <span className="text-base">{p.user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add car button */}
      {isParticipating && !myCar && (
        <button
          onClick={() => setShowCarSelector(true)}
          className="w-full btn-secondary mb-4 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          J'ai ma voiture
        </button>
      )}

      {/* Cars */}
      {session && session.cars.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-medium mb-3">Voitures</h2>
          <div className="space-y-3">
            {session.cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isBanned={bansReceived.includes(car.driverId)}
                onRefresh={refresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="mb-4">
        <h2 className="text-lg font-medium mb-3">Membres du groupe</h2>
        <div className="card divide-y divide-gray-100">
          {currentGroup.members.map((member) => (
            <div key={member.id} className="p-3 flex items-center gap-3">
              <Avatar user={member} size="md" />
              <div className="flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Inviter des potes</h2>
            <p className="text-gray-600 mb-4">
              Partage ce code pour inviter tes potes :
            </p>
            <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
              <p className="text-2xl font-mono font-bold tracking-wider">
                {currentGroup.inviteCode}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentGroup.inviteCode)
              }}
              className="w-full btn-secondary mb-2"
            >
              Copier le code
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="w-full btn-ghost"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Car Selector Modal */}
      {showCarSelector && (
        <UserCarSelector
          onSelect={handleCarSelected}
          onClose={() => setShowCarSelector(false)}
        />
      )}

      {/* Group Settings Modal */}
      {showSettings && currentGroup && (
        <GroupSettingsModal
          group={currentGroup}
          onSave={handleUpdateGroup}
          onDelete={handleDeleteGroup}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
