import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGroupsStore } from './groups'
import * as apiModule from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    getGroups: vi.fn(),
    getGroup: vi.fn(),
    createGroup: vi.fn(),
    joinGroup: vi.fn(),
    leaveGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn()
  }
}))

describe('useGroupsStore', () => {
  const mockGroup = {
    id: 'group-123',
    name: 'Test Group',
    inviteCode: 'ABC123',
    members: []
  }

  const mockGroup2 = {
    id: 'group-456',
    name: 'Second Group',
    inviteCode: 'DEF456',
    members: []
  }

  beforeEach(() => {
    useGroupsStore.setState({
      groups: [],
      currentGroup: null,
      currentUserRole: null,
      loading: false,
      error: null
    })
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('should have empty groups array initially', () => {
      const { groups } = useGroupsStore.getState()
      expect(groups).toEqual([])
    })

    it('should have currentGroup as null initially', () => {
      const { currentGroup } = useGroupsStore.getState()
      expect(currentGroup).toBeNull()
    })

    it('should have currentUserRole as null initially', () => {
      const { currentUserRole } = useGroupsStore.getState()
      expect(currentUserRole).toBeNull()
    })

    it('should have loading as false initially', () => {
      const { loading } = useGroupsStore.getState()
      expect(loading).toBe(false)
    })

    it('should have error as null initially', () => {
      const { error } = useGroupsStore.getState()
      expect(error).toBeNull()
    })
  })

  describe('fetchGroups', () => {
    it('should fetch and set groups successfully', async () => {
      vi.mocked(apiModule.api.getGroups).mockResolvedValue({
        groups: [mockGroup, mockGroup2]
      })

      await useGroupsStore.getState().fetchGroups()

      const { groups, loading, error } = useGroupsStore.getState()
      expect(groups).toEqual([mockGroup, mockGroup2])
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should set error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch groups'
      vi.mocked(apiModule.api.getGroups).mockRejectedValue(new Error(errorMessage))

      await useGroupsStore.getState().fetchGroups()

      const { groups, error, loading } = useGroupsStore.getState()
      expect(groups).toEqual([])
      expect(error).toBe(errorMessage)
      expect(loading).toBe(false)
    })

    it('should set loading to true during fetch', async () => {
      vi.mocked(apiModule.api.getGroups).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ groups: [] }), 100))
      )

      const promise = useGroupsStore.getState().fetchGroups()
      const { loading } = useGroupsStore.getState()
      expect(loading).toBe(true)

      await promise
    })
  })

  describe('fetchGroup', () => {
    it('should fetch and set current group and role', async () => {
      vi.mocked(apiModule.api.getGroup).mockResolvedValue({
        group: mockGroup,
        role: 'admin'
      })

      await useGroupsStore.getState().fetchGroup('group-123')

      const { currentGroup, currentUserRole, loading, error } = useGroupsStore.getState()
      expect(currentGroup).toEqual(mockGroup)
      expect(currentUserRole).toBe('admin')
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should set error on fetch failure', async () => {
      const errorMessage = 'Group not found'
      vi.mocked(apiModule.api.getGroup).mockRejectedValue(new Error(errorMessage))

      await useGroupsStore.getState().fetchGroup('invalid-id')

      const { currentGroup, error } = useGroupsStore.getState()
      expect(currentGroup).toBeNull()
      expect(error).toBe(errorMessage)
    })
  })

  describe('createGroup', () => {
    it('should create and add group to list', async () => {
      vi.mocked(apiModule.api.createGroup).mockResolvedValue({ group: mockGroup })

      const result = await useGroupsStore.getState().createGroup('Test Group')

      const { groups, loading, error } = useGroupsStore.getState()
      expect(result).toEqual(mockGroup)
      expect(groups).toContain(mockGroup)
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should set error and throw on creation failure', async () => {
      const errorMessage = 'Failed to create group'
      vi.mocked(apiModule.api.createGroup).mockRejectedValue(new Error(errorMessage))

      await expect(
        useGroupsStore.getState().createGroup('Test Group')
      ).rejects.toThrow(errorMessage)

      const { error } = useGroupsStore.getState()
      expect(error).toBe(errorMessage)
    })
  })

  describe('joinGroup', () => {
    it('should join group and add to list', async () => {
      vi.mocked(apiModule.api.joinGroup).mockResolvedValue({ group: mockGroup })

      const result = await useGroupsStore.getState().joinGroup('ABC123')

      const { groups, loading, error } = useGroupsStore.getState()
      expect(result).toEqual(mockGroup)
      expect(groups).toContain(mockGroup)
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should not duplicate group if already in list', async () => {
      useGroupsStore.setState({ groups: [mockGroup] })
      vi.mocked(apiModule.api.joinGroup).mockResolvedValue({ group: mockGroup })

      await useGroupsStore.getState().joinGroup('ABC123')

      const { groups } = useGroupsStore.getState()
      expect(groups).toHaveLength(1)
      expect(groups[0]).toEqual(mockGroup)
    })

    it('should set error and throw on join failure', async () => {
      const errorMessage = 'Invalid invite code'
      vi.mocked(apiModule.api.joinGroup).mockRejectedValue(new Error(errorMessage))

      await expect(
        useGroupsStore.getState().joinGroup('INVALID')
      ).rejects.toThrow(errorMessage)

      const { error } = useGroupsStore.getState()
      expect(error).toBe(errorMessage)
    })
  })

  describe('leaveGroup', () => {
    it('should remove group from list', async () => {
      useGroupsStore.setState({ groups: [mockGroup, mockGroup2] })
      vi.mocked(apiModule.api.leaveGroup).mockResolvedValue({ message: 'Left group' })

      await useGroupsStore.getState().leaveGroup('group-123')

      const { groups } = useGroupsStore.getState()
      expect(groups).not.toContain(mockGroup)
      expect(groups).toContain(mockGroup2)
    })

    it('should clear currentGroup if leaving current group', async () => {
      useGroupsStore.setState({
        groups: [mockGroup],
        currentGroup: mockGroup
      })
      vi.mocked(apiModule.api.leaveGroup).mockResolvedValue({ message: 'Left group' })

      await useGroupsStore.getState().leaveGroup('group-123')

      const { currentGroup } = useGroupsStore.getState()
      expect(currentGroup).toBeNull()
    })

    it('should not clear currentGroup if leaving different group', async () => {
      useGroupsStore.setState({
        groups: [mockGroup, mockGroup2],
        currentGroup: mockGroup
      })
      vi.mocked(apiModule.api.leaveGroup).mockResolvedValue({ message: 'Left group' })

      await useGroupsStore.getState().leaveGroup('group-456')

      const { currentGroup } = useGroupsStore.getState()
      expect(currentGroup).toEqual(mockGroup)
    })

    it('should set error and throw on leave failure', async () => {
      const errorMessage = 'Failed to leave group'
      vi.mocked(apiModule.api.leaveGroup).mockRejectedValue(new Error(errorMessage))

      await expect(
        useGroupsStore.getState().leaveGroup('group-123')
      ).rejects.toThrow(errorMessage)
    })
  })

  describe('updateGroup', () => {
    it('should update group in list', async () => {
      const updatedGroup = { ...mockGroup, name: 'Updated Name' }
      useGroupsStore.setState({ groups: [mockGroup] })
      vi.mocked(apiModule.api.updateGroup).mockResolvedValue({ group: updatedGroup })

      const result = await useGroupsStore.getState().updateGroup('group-123', { name: 'Updated Name' })

      const { groups } = useGroupsStore.getState()
      expect(result).toEqual(updatedGroup)
      expect(groups[0].name).toBe('Updated Name')
    })

    it('should update currentGroup if updating current group', async () => {
      const updatedGroup = { ...mockGroup, name: 'Updated Name' }
      useGroupsStore.setState({
        groups: [mockGroup],
        currentGroup: mockGroup
      })
      vi.mocked(apiModule.api.updateGroup).mockResolvedValue({ group: updatedGroup })

      await useGroupsStore.getState().updateGroup('group-123', { name: 'Updated Name' })

      const { currentGroup } = useGroupsStore.getState()
      expect(currentGroup?.name).toBe('Updated Name')
    })

    it('should set error and throw on update failure', async () => {
      const errorMessage = 'Failed to update group'
      vi.mocked(apiModule.api.updateGroup).mockRejectedValue(new Error(errorMessage))

      await expect(
        useGroupsStore.getState().updateGroup('group-123', { name: 'New Name' })
      ).rejects.toThrow(errorMessage)
    })
  })

  describe('deleteGroup', () => {
    it('should remove group from list', async () => {
      useGroupsStore.setState({ groups: [mockGroup, mockGroup2] })
      vi.mocked(apiModule.api.deleteGroup).mockResolvedValue({ message: 'Deleted' })

      await useGroupsStore.getState().deleteGroup('group-123')

      const { groups } = useGroupsStore.getState()
      expect(groups).not.toContain(mockGroup)
      expect(groups).toContain(mockGroup2)
    })

    it('should clear currentGroup and role if deleting current group', async () => {
      useGroupsStore.setState({
        groups: [mockGroup],
        currentGroup: mockGroup,
        currentUserRole: 'admin'
      })
      vi.mocked(apiModule.api.deleteGroup).mockResolvedValue({ message: 'Deleted' })

      await useGroupsStore.getState().deleteGroup('group-123')

      const { currentGroup, currentUserRole } = useGroupsStore.getState()
      expect(currentGroup).toBeNull()
      expect(currentUserRole).toBeNull()
    })

    it('should set error and throw on delete failure', async () => {
      const errorMessage = 'Failed to delete group'
      vi.mocked(apiModule.api.deleteGroup).mockRejectedValue(new Error(errorMessage))

      await expect(
        useGroupsStore.getState().deleteGroup('group-123')
      ).rejects.toThrow(errorMessage)
    })
  })
})
