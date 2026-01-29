import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGroupsStore } from '../stores/groups'
import { isImageUrl } from '../lib/utils'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Avatar } from '../components/Avatar'
import { GroupSettingsModal } from '../components/GroupSettingsModal'
import { CreateSessionModal } from '../components/CreateSessionModal'
import { CreateRecurrenceModal } from '../components/CreateRecurrenceModal'
import { UpcomingSessionsList } from '../components/UpcomingSessionsList'
import { MonthCalendar } from '../components/MonthCalendar'

type ViewMode = 'list' | 'calendar'

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { currentGroup, currentUserRole, fetchGroup, updateGroup, deleteGroup, loading: groupLoading, error: groupError } = useGroupsStore()
  const navigate = useNavigate()
  const [showInvite, setShowInvite] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [showCreateRecurrence, setShowCreateRecurrence] = useState(false)
  const [showSessionMenu, setShowSessionMenu] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('pioum-view-mode')
    return (saved === 'calendar' || saved === 'list') ? saved : 'list'
  })

  // Ref to trigger refresh of upcoming sessions
  const refreshKeyRef = useRef(0)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (groupId) {
      fetchGroup(groupId)
    }
  }, [groupId, fetchGroup])

  const handleRefreshSessions = useCallback(() => {
    refreshKeyRef.current += 1
    setRefreshKey(refreshKeyRef.current)
  }, [])

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
            <div className="w-16 h-16 flex items-center justify-center text-4xl bg-primary-100 rounded-full overflow-hidden border-2 border-primary-300">
              {isImageUrl(currentGroup.avatar.imageUrl) ? (
                <img src={currentGroup.avatar.imageUrl} alt={currentGroup.avatar.name} className="w-full h-full object-cover" />
              ) : (
                currentGroup.avatar.imageUrl
              )}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-primary-800">{currentGroup.name}</h1>
            <p className="text-sm text-primary-600">
              {currentGroup.members.length} membre{currentGroup.members.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-warm hover:bg-primary-100 transition-colors text-primary-700"
              title="Paramètres du groupe"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowSessionMenu(!showSessionMenu)}
              className="p-2 rounded-warm hover:bg-primary-100 transition-colors text-primary-700"
              title="Nouvelle séance"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {showSessionMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSessionMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-warm shadow-warm-lg border-2 border-primary-200 py-1 z-50 min-w-[180px]">
                  <button
                    onClick={() => {
                      setShowSessionMenu(false)
                      setShowCreateSession(true)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-primary-800 hover:bg-primary-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Séance ponctuelle
                  </button>
                  <button
                    onClick={() => {
                      setShowSessionMenu(false)
                      setShowCreateRecurrence(true)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-primary-800 hover:bg-primary-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Récurrence
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="p-2 rounded-warm hover:bg-primary-100 transition-colors text-primary-700"
            title="Inviter des potes"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-primary-800">Prochaines séances</h2>
          {/* View Mode Toggle */}
          <div className="flex bg-primary-100 rounded-warm p-0.5">
            <button
              onClick={() => {
                setViewMode('list')
                localStorage.setItem('pioum-view-mode', 'list')
              }}
              className={`px-3 py-1 text-sm rounded-warm transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-800 shadow-warm'
                  : 'text-primary-600 hover:text-primary-800'
              }`}
              aria-label="Vue liste"
              title="Vue liste"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => {
                setViewMode('calendar')
                localStorage.setItem('pioum-view-mode', 'calendar')
              }}
              className={`px-3 py-1 text-sm rounded-warm transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-primary-800 shadow-warm'
                  : 'text-primary-600 hover:text-primary-800'
              }`}
              aria-label="Vue calendrier"
              title="Vue calendrier"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        {groupId && viewMode === 'list' && (
          <UpcomingSessionsList
            groupId={groupId}
            refreshTrigger={refreshKey}
            isAdmin={isAdmin}
          />
        )}
        {groupId && viewMode === 'calendar' && (
          <MonthCalendar
            groupId={groupId}
            refreshTrigger={refreshKey}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* Members */}
      <div className="mb-4">
        <h2 className="text-lg font-medium mb-3 text-primary-800">Membres du groupe</h2>
        <div className="card divide-y divide-primary-200">
          {currentGroup.members.map((member) => (
            <div key={member.id} className="p-3 flex items-center gap-3">
              <Avatar user={member} size="md" />
              <div className="flex-1">
                <p className="font-medium text-primary-800">{member.name}</p>
                <p className="text-sm text-primary-600">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300">
            <h2 className="text-xl font-bold mb-4 text-primary-800">Inviter des potes</h2>
            <p className="text-primary-700 mb-4">
              Partage ce code pour inviter tes potes :
            </p>
            <div className="bg-primary-100 p-4 rounded-warm text-center mb-4 border-2 border-primary-300">
              <p className="text-2xl font-mono font-bold tracking-wider text-primary-800">
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

      {/* Group Settings Modal */}
      {showSettings && currentGroup && (
        <GroupSettingsModal
          group={currentGroup}
          onSave={handleUpdateGroup}
          onDelete={handleDeleteGroup}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Create Session Modal */}
      {showCreateSession && groupId && (
        <CreateSessionModal
          groupId={groupId}
          onClose={() => setShowCreateSession(false)}
          onCreated={handleRefreshSessions}
        />
      )}

      {/* Create Recurrence Modal */}
      {showCreateRecurrence && groupId && (
        <CreateRecurrenceModal
          groupId={groupId}
          onClose={() => setShowCreateRecurrence(false)}
          onCreated={handleRefreshSessions}
        />
      )}
    </div>
  )
}
