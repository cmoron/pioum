import { create } from 'zustand'
import { api, Group } from '../lib/api'

interface GroupsState {
  groups: Group[]
  currentGroup: Group | null
  currentUserRole: string | null
  loading: boolean
  error: string | null
  fetchGroups: () => Promise<void>
  fetchGroup: (id: string) => Promise<void>
  createGroup: (name: string) => Promise<Group>
  joinGroup: (inviteCode: string) => Promise<Group>
  leaveGroup: (groupId: string) => Promise<void>
  updateGroup: (id: string, data: { name?: string; avatarId?: string | null }) => Promise<Group>
  deleteGroup: (id: string) => Promise<void>
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  currentGroup: null,
  currentUserRole: null,
  loading: false,
  error: null,

  fetchGroups: async () => {
    try {
      set({ loading: true, error: null })
      const { groups } = await api.getGroups()
      set({ groups, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchGroup: async (id: string) => {
    try {
      set({ loading: true, error: null })
      const { group, role } = await api.getGroup(id)
      set({ currentGroup: group, currentUserRole: role, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createGroup: async (name: string) => {
    try {
      set({ loading: true, error: null })
      const { group } = await api.createGroup(name)
      set((state) => ({
        groups: [...state.groups, group],
        loading: false
      }))
      return group
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  joinGroup: async (inviteCode: string) => {
    try {
      set({ loading: true, error: null })
      const { group } = await api.joinGroup(inviteCode)
      const { groups } = get()
      if (!groups.find((g) => g.id === group.id)) {
        set({ groups: [...groups, group] })
      }
      set({ loading: false })
      return group
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  leaveGroup: async (groupId: string) => {
    try {
      set({ loading: true, error: null })
      await api.leaveGroup(groupId)
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
        loading: false
      }))
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  updateGroup: async (id: string, data: { name?: string; avatarId?: string | null }) => {
    try {
      set({ loading: true, error: null })
      const { group } = await api.updateGroup(id, data)
      set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? group : g)),
        currentGroup: state.currentGroup?.id === id ? group : state.currentGroup,
        loading: false
      }))
      return group
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  deleteGroup: async (id: string) => {
    try {
      set({ loading: true, error: null })
      await api.deleteGroup(id)
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        currentGroup: state.currentGroup?.id === id ? null : state.currentGroup,
        currentUserRole: state.currentGroup?.id === id ? null : state.currentUserRole,
        loading: false
      }))
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  }
}))
