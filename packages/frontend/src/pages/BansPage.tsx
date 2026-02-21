import { useEffect, useState } from 'react'
import { api, Ban, GroupMember, HallOfFame, User } from '../lib/api'
import { Avatar } from '../components/Avatar'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BanModal } from '@/components/BanModal'
import { useAuthStore } from '@/stores/auth'

export function BansPage() {
  const [bansGiven, setBansGiven] = useState<Ban[]>([])
  const [bansReceived, setBansReceived] = useState<Ban[]>([])
  const [hallOfFame, setHallOfFame] = useState<HallOfFame | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'given' | 'received' | 'hall'>('given')
  const [displayBanModal, setDisplayBanModal] = useState<boolean>(false);
  const [userToBan, setUserToBan] = useState<User | undefined>();
  const [users, setUsers] = useState<User[] | null>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    Promise.all([
      api.getActiveBans(),
      api.getHallOfFame(),
      api.users()
    ]).then(([bans, hof, users]) => {
      setBansGiven(bans.bansGiven)
      setBansReceived(bans.bansReceived)
      setHallOfFame(hof.hallOfFame)
      setUsers(users.users);
    }).finally(() => setLoading(false))
  }, [])

  const handleLiftBan = async (banId: string) => {
    if (!confirm('Lever ce ban ?')) return
    try {
      await api.liftBan(banId)
      setBansGiven((prev) => prev.filter((b) => b.id !== banId))
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (

    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Bans</h1>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'given', label: 'Donnés', count: bansGiven.length },
          { id: 'received', label: 'Reçus', count: bansReceived.length },
          { id: 'hall', label: 'Hall of Fame' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${activeTab === tab.id
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 opacity-75">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Bans Given */}
      {activeTab === 'given' && (
        <div>
          {bansGiven.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Tu n'as banni personne (pour l'instant...)
            </p>
          ) : (
            <div className="space-y-3">
              {bansGiven.map((ban) => (
                <BanCard
                  key={ban.id}
                  ban={ban}
                  type="given"
                  onLift={() => handleLiftBan(ban.id)}
                />
              ))}
            </div>
          )}
          <div className='container-fluid'>
            <div className='row mt-2'>
              <div className="col-12 text-center">
                <button type="button" className="btn btn-danger" onClick={() => setDisplayBanModal(true)}>Bannir un utilisateur</button>
              </div>
            </div>
          </div>
          {displayBanModal &&
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300">
                <h2 className="text-xl font-bold mb-4 text-primary-800">Qui a fauté?</h2>
                {users && users.filter(u => u.id != user?.id).map((user) => {
                  let isUserAlreadyBanned = false;
                  if (bansGiven.find(b => b.receiverId === user.id)) {
                    isUserAlreadyBanned = true;
                  }
                  if (isUserAlreadyBanned) {
                    return <div key={user.id} className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-warm border border-primary-200">
                      <Avatar user={user} size="md" />
                      <div className="flex-1">
                        <p className="font-medium text-primary-800">{user.name}</p>
                        <p className="text-sm text-primary-600">Vous avez déjà banni cette personne</p>
                      </div>
                    </div>
                  } else {
                    return <div key={user.id} className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-warm border border-primary-200" onClick={() => setUserToBan(user)}>
                      <Avatar user={user} size="md" />
                      <div className="flex-1">
                        <p className="font-medium text-primary-800">{user.name}</p>
                      </div>
                    </div>
                  }

                })}
                {userToBan && <BanModal user={{ id: userToBan.id, name: userToBan.name }} onBanned={(ban) => {setBansGiven([...bansGiven, ban])}} onClose={() => {
                  setUserToBan(undefined)
                  setDisplayBanModal(false)
                }} />}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDisplayBanModal(false)}
                    className="btn-secondary flex-1"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>}

        </div>
      )}

      {/* Bans Received */}
      {activeTab === 'received' && (
        <div>
          {bansReceived.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Tu n'es banni de nulle part !
            </p>
          ) : (
            <div className="space-y-3">
              {bansReceived.map((ban) => (
                <BanCard key={ban.id} ban={ban} type="received" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hall of Fame */}
      {activeTab === 'hall' && hallOfFame && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
              <span>Top Banneurs</span>
              <span className="text-2xl">🔨</span>
            </h2>
            {hallOfFame.topBanners.length === 0 ? (
              <p className="text-gray-500">Pas encore de bans</p>
            ) : (
              <div className="card divide-y divide-gray-100">
                {hallOfFame.topBanners.map((entry, i) => (
                  <div key={entry.user.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-gray-400">
                      {i + 1}
                    </span>
                    <Avatar user={entry.user} size="sm" />
                    <span className="flex-1 font-medium">{entry.user.name}</span>
                    <span className="text-primary-600 font-bold">{entry.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
              <span>Top Bannis</span>
              <span className="text-2xl">🎯</span>
            </h2>
            {hallOfFame.topBanned.length === 0 ? (
              <p className="text-gray-500">Pas encore de bans</p>
            ) : (
              <div className="card divide-y divide-gray-100">
                {hallOfFame.topBanned.map((entry, i) => (
                  <div key={entry.user.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-gray-400">
                      {i + 1}
                    </span>
                    <Avatar user={entry.user} size="sm" />
                    <span className="flex-1 font-medium">{entry.user.name}</span>
                    <span className="text-red-500 font-bold">{entry.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface BanCardProps {
  ban: Ban
  type: 'given' | 'received'
  onLift?: () => void
}

function BanCard({ ban, type, onLift }: BanCardProps) {
  const user = type === 'given' ? ban.receiver : ban.giver
  const timeLeft = formatDistanceToNow(new Date(ban.endsAt), {
    locale: fr,
    addSuffix: false
  })

  if (!user) return null

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Avatar user={user} size="md" />
        <div className="flex-1">
          <p className="font-medium">{user.name}</p>
          {ban.reason && (
            <p className="text-sm text-gray-500">"{ban.reason}"</p>
          )}
          <p className="text-sm text-red-500">
            Expire dans {timeLeft}
          </p>
        </div>
        {type === 'given' && onLift && (
          <button
            onClick={onLift}
            className="btn-secondary text-sm"
          >
            Lever
          </button>
        )}
      </div>
    </div>
  )
}
