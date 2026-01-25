import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { VerifyPage } from './pages/VerifyPage'
import { HomePage } from './pages/HomePage'
import { GroupPage } from './pages/GroupPage'
import { SessionPage } from './pages/SessionPage'
import { ProfilePage } from './pages/ProfilePage'
import { JoinGroupPage } from './pages/JoinGroupPage'
import { CreateGroupPage } from './pages/CreateGroupPage'
import { BansPage } from './pages/BansPage'
import { LoadingSpinner } from './components/LoadingSpinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { checkAuth, loading } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/groups/create" element={<CreateGroupPage />} />
                <Route path="/groups/join" element={<JoinGroupPage />} />
                <Route path="/groups/:groupId" element={<GroupPage />} />
                <Route path="/sessions/:sessionId" element={<SessionPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/bans" element={<BansPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
