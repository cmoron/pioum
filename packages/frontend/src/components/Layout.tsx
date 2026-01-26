import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { Avatar } from './Avatar'

const navItems = [
  { path: '/', label: 'Accueil', icon: HomeIcon },
  { path: '/bans', label: 'Bans', icon: BanIcon },
  { path: '/profile', label: 'Profil', icon: UserIcon }
]

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col bg-primary-50">
      {/* Header - Enlarged */}
      <header className="bg-warm border-b-2 border-warmDark px-4 py-5 flex items-center justify-between shadow-warm">
        <Link to="/" className="flex items-center gap-4">
          <div className="h-20 flex-shrink-0">
            <img
              src="/logo.png"
              alt="Pioum Logo"
              className="h-full w-auto object-contain"
            />
          </div>
          <span className="text-4xl font-bold text-primary-700">Pioum</span>
        </Link>
        {user && (
          <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar user={user} size="sm" />
          </Link>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom navigation - Updated theme */}
      <nav className="fixed bottom-0 left-0 right-0 bg-warm border-t-2 border-warmDark px-4 py-3 safe-area-bottom shadow-warm-lg">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 rounded-warm transition-all ${
                  isActive
                    ? 'text-primary-800 bg-primary-200'
                    : 'text-primary-600 hover:text-primary-800 hover:bg-primary-100'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function BanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
