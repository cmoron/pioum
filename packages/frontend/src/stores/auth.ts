import { create } from 'zustand'
import { api, User } from '../lib/api'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  checkAuth: () => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  requestMagicLink: (email: string, name?: string) => Promise<void>
  verifyMagicLink: (token: string) => Promise<void>
  devLogin: (name: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  checkAuth: async () => {
    try {
      set({ loading: true, error: null })
      const { user } = await api.getMe()
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  loginWithGoogle: async (credential: string) => {
    try {
      set({ loading: true, error: null })
      const { user } = await api.googleAuth(credential)
      set({ user, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  requestMagicLink: async (email: string, name?: string) => {
    try {
      set({ loading: true, error: null })
      await api.requestMagicLink(email, name)
      set({ loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  verifyMagicLink: async (token: string) => {
    try {
      set({ loading: true, error: null })
      const { user } = await api.verifyMagicLink(token)
      set({ user, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  devLogin: async (name: string) => {
    try {
      set({ loading: true, error: null })
      const { user } = await api.devLogin(name)
      set({ user, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  logout: async () => {
    try {
      await api.logout()
      set({ user: null })
    } catch (err) {
      console.error('Logout error:', err)
    }
  },

  updateUser: (user: User) => {
    set({ user })
  }
}))
