import { useState } from 'react'
import { AdminAvatarsTab } from '../components/AdminAvatarsTab'
import { AdminUsersTab } from '../components/AdminUsersTab'

type Tab = 'avatars' | 'users'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('avatars')

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-primary-800 mb-4">Administration</h1>

      <div className="flex gap-2 mb-6">
        {(['avatars', 'users'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-warm font-medium transition-all ${
              tab === t
                ? 'bg-primary-700 text-white shadow-warm'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}
          >
            {t === 'avatars' ? 'Avatars' : 'Utilisateurs'}
          </button>
        ))}
      </div>

      {tab === 'avatars' ? <AdminAvatarsTab /> : <AdminUsersTab />}
    </div>
  )
}
