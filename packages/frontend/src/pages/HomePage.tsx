import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useGroupsStore } from '../stores/groups'
import { isImageUrl } from '../lib/utils'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Avatar } from '../components/Avatar'

export function HomePage() {
  const { groups, loading, fetchGroups } = useGroupsStore()

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Mes groupes</h1>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Pas encore de groupe</h2>
          <p className="text-gray-500 mb-6">Crée ou rejoins un groupe pour commencer</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link to="/groups/create" className="btn-primary">
              Créer un groupe
            </Link>
            <Link to="/groups/join" className="btn-secondary">
              Rejoindre un groupe
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {group.avatar ? (
                    <div className="w-16 h-16 flex items-center justify-center text-3xl bg-primary-50 rounded-full flex-shrink-0 overflow-hidden">
                      {isImageUrl(group.avatar.imageUrl) ? (
                        <img src={group.avatar.imageUrl} alt={group.avatar.name} className="w-full h-full object-cover" />
                      ) : (
                        group.avatar.imageUrl
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full flex-shrink-0">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{group.name}</h3>
                    <p className="text-sm text-gray-500">
                      {group.members.length} membre{group.members.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex -space-x-3">
                  {group.members.slice(0, 4).map((member) => (
                    <Avatar
                      key={member.id}
                      user={member}
                      size="sm"
                      className="ring-2 ring-white"
                    />
                  ))}
                  {group.members.length > 4 && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 ring-2 ring-white">
                      +{group.members.length - 4}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="flex gap-3">
            <Link to="/groups/create" className="btn-primary flex-1">
              Créer
            </Link>
            <Link to="/groups/join" className="btn-secondary flex-1">
              Rejoindre
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
