import { create } from 'zustand'
import { api, UserCar } from '../lib/api'

interface UserCarsState {
  userCars: UserCar[]
  loading: boolean
  error: string | null
  fetchUserCars: () => Promise<void>
  createUserCar: (data: { name?: string; avatarId: string; defaultSeats?: number }) => Promise<void>
  updateUserCar: (id: string, data: { name?: string | null; avatarId?: string; defaultSeats?: number }) => Promise<void>
  deleteUserCar: (id: string) => Promise<void>
}

export const useUserCarsStore = create<UserCarsState>((set, get) => ({
  userCars: [],
  loading: false,
  error: null,

  fetchUserCars: async () => {
    try {
      set({ loading: true, error: null })
      const { userCars } = await api.getUserCars()
      set({ userCars, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createUserCar: async (data) => {
    try {
      set({ loading: true, error: null })
      const { userCar } = await api.createUserCar(data)
      set({
        userCars: [userCar, ...get().userCars],
        loading: false
      })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  updateUserCar: async (id, data) => {
    try {
      set({ loading: true, error: null })
      const { userCar } = await api.updateUserCar(id, data)
      set({
        userCars: get().userCars.map(c => c.id === id ? userCar : c),
        loading: false
      })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  deleteUserCar: async (id) => {
    try {
      set({ loading: true, error: null })
      await api.deleteUserCar(id)
      set({
        userCars: get().userCars.filter(c => c.id !== id),
        loading: false
      })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  }
}))
