import { create } from 'zustand'
import { api, Session } from '../lib/api'

interface SessionState {
  session: Session | null
  loading: boolean
  error: string | null
  fetchTodaySession: (groupId: string) => Promise<void>
  fetchSession: (id: string) => Promise<void>
  joinSession: () => Promise<void>
  leaveSession: () => Promise<void>
  addCar: (seats?: number, userCarId?: string) => Promise<void>
  updateCar: (carId: string, seats: number) => Promise<void>
  removeCar: (carId: string) => Promise<void>
  joinCar: (carId: string) => Promise<void>
  leaveCar: (carId: string) => Promise<void>
  kickPassenger: (carId: string, userId: string) => Promise<void>
  refresh: () => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  loading: false,
  error: null,

  fetchTodaySession: async (groupId: string) => {
    try {
      set({ loading: true, error: null })
      const { session } = await api.getTodaySession(groupId)
      set({ session, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchSession: async (id: string) => {
    try {
      set({ loading: true, error: null })
      const { session } = await api.getSession(id)
      set({ session, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  joinSession: async () => {
    const { session } = get()
    if (!session) return
    try {
      set({ error: null })
      await api.joinSession(session.id)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  leaveSession: async () => {
    const { session } = get()
    if (!session) return
    try {
      set({ error: null })
      await api.leaveSession(session.id)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  addCar: async (seats?: number, userCarId?: string) => {
    const { session } = get()
    if (!session) return
    try {
      set({ error: null })
      await api.addCar(session.id, seats, userCarId)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  updateCar: async (carId: string, seats: number) => {
    try {
      set({ error: null })
      await api.updateCar(carId, seats)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  removeCar: async (carId: string) => {
    try {
      set({ error: null })
      await api.removeCar(carId)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  joinCar: async (carId: string) => {
    try {
      set({ error: null })
      await api.joinCar(carId)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  leaveCar: async (carId: string) => {
    try {
      set({ error: null })
      await api.leaveCar(carId)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  kickPassenger: async (carId: string, userId: string) => {
    try {
      set({ error: null })
      await api.kickPassenger(carId, userId)
      await get().refresh()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  refresh: async () => {
    const { session } = get()
    if (session) {
      const { session: updated } = await api.getSession(session.id)
      set({ session: updated })
    }
  }
}))
