import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUserCarsStore } from './userCars'
import * as apiModule from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    getUserCars: vi.fn(),
    createUserCar: vi.fn(),
    updateUserCar: vi.fn(),
    deleteUserCar: vi.fn()
  }
}))

describe('useUserCarsStore', () => {
  const mockUserCar = {
    id: 'car-123',
    userId: 'user-1',
    name: 'My Car',
    avatarId: 'avatar-1',
    defaultSeats: 4,
    avatar: {
      id: 'avatar-1',
      name: 'Car Icon',
      imageUrl: '🚗'
    },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }

  const mockUserCar2 = {
    id: 'car-456',
    userId: 'user-1',
    name: 'Second Car',
    avatarId: 'avatar-2',
    defaultSeats: 5,
    avatar: {
      id: 'avatar-2',
      name: 'Van Icon',
      imageUrl: '🚙'
    },
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02'
  }

  beforeEach(() => {
    useUserCarsStore.setState({
      userCars: [],
      loading: false,
      error: null
    })
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('should have empty userCars array initially', () => {
      const { userCars } = useUserCarsStore.getState()
      expect(userCars).toEqual([])
    })

    it('should have loading as false initially', () => {
      const { loading } = useUserCarsStore.getState()
      expect(loading).toBe(false)
    })

    it('should have error as null initially', () => {
      const { error } = useUserCarsStore.getState()
      expect(error).toBeNull()
    })
  })

  describe('fetchUserCars', () => {
    it('should fetch and set user cars successfully', async () => {
      vi.mocked(apiModule.api.getUserCars).mockResolvedValue({
        userCars: [mockUserCar, mockUserCar2]
      })

      await useUserCarsStore.getState().fetchUserCars()

      const { userCars, loading, error } = useUserCarsStore.getState()
      expect(userCars).toEqual([mockUserCar, mockUserCar2])
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should set error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch user cars'
      vi.mocked(apiModule.api.getUserCars).mockRejectedValue(new Error(errorMessage))

      await useUserCarsStore.getState().fetchUserCars()

      const { userCars, error, loading } = useUserCarsStore.getState()
      expect(userCars).toEqual([])
      expect(error).toBe(errorMessage)
      expect(loading).toBe(false)
    })

    it('should set loading to true during fetch', async () => {
      vi.mocked(apiModule.api.getUserCars).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ userCars: [] }), 100))
      )

      const promise = useUserCarsStore.getState().fetchUserCars()
      const { loading } = useUserCarsStore.getState()
      expect(loading).toBe(true)

      await promise
    })

    it('should clear previous error on successful fetch', async () => {
      useUserCarsStore.setState({ error: 'Previous error' })
      vi.mocked(apiModule.api.getUserCars).mockResolvedValue({ userCars: [mockUserCar] })

      await useUserCarsStore.getState().fetchUserCars()

      const { error } = useUserCarsStore.getState()
      expect(error).toBeNull()
    })
  })

  describe('createUserCar', () => {
    it('should create and add user car to the beginning of list', async () => {
      useUserCarsStore.setState({ userCars: [mockUserCar2] })
      vi.mocked(apiModule.api.createUserCar).mockResolvedValue({ userCar: mockUserCar })

      await useUserCarsStore.getState().createUserCar({
        name: 'My Car',
        avatarId: 'avatar-1',
        defaultSeats: 4
      })

      const { userCars, loading, error } = useUserCarsStore.getState()
      expect(userCars[0]).toEqual(mockUserCar)
      expect(userCars[1]).toEqual(mockUserCar2)
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should create user car without name', async () => {
      vi.mocked(apiModule.api.createUserCar).mockResolvedValue({ userCar: mockUserCar })

      await useUserCarsStore.getState().createUserCar({
        avatarId: 'avatar-1'
      })

      expect(apiModule.api.createUserCar).toHaveBeenCalledWith({
        avatarId: 'avatar-1'
      })
    })

    it('should set error and throw on creation failure', async () => {
      const errorMessage = 'Failed to create user car'
      vi.mocked(apiModule.api.createUserCar).mockRejectedValue(new Error(errorMessage))

      await expect(
        useUserCarsStore.getState().createUserCar({ avatarId: 'avatar-1' })
      ).rejects.toThrow(errorMessage)

      const { error, loading } = useUserCarsStore.getState()
      expect(error).toBe(errorMessage)
      expect(loading).toBe(false)
    })

    it('should set loading to true during creation', async () => {
      vi.mocked(apiModule.api.createUserCar).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ userCar: mockUserCar }), 100))
      )

      const promise = useUserCarsStore.getState().createUserCar({ avatarId: 'avatar-1' })
      const { loading } = useUserCarsStore.getState()
      expect(loading).toBe(true)

      await promise
    })
  })

  describe('updateUserCar', () => {
    it('should update user car in list', async () => {
      const updatedCar = { ...mockUserCar, name: 'Updated Car Name', defaultSeats: 5 }
      useUserCarsStore.setState({ userCars: [mockUserCar, mockUserCar2] })
      vi.mocked(apiModule.api.updateUserCar).mockResolvedValue({ userCar: updatedCar })

      await useUserCarsStore.getState().updateUserCar('car-123', {
        name: 'Updated Car Name',
        defaultSeats: 5
      })

      const { userCars, loading, error } = useUserCarsStore.getState()
      expect(userCars[0].name).toBe('Updated Car Name')
      expect(userCars[0].defaultSeats).toBe(5)
      expect(userCars[1]).toEqual(mockUserCar2)
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should update only specified fields', async () => {
      const updatedCar = { ...mockUserCar, avatarId: 'avatar-new' }
      useUserCarsStore.setState({ userCars: [mockUserCar] })
      vi.mocked(apiModule.api.updateUserCar).mockResolvedValue({ userCar: updatedCar })

      await useUserCarsStore.getState().updateUserCar('car-123', {
        avatarId: 'avatar-new'
      })

      expect(apiModule.api.updateUserCar).toHaveBeenCalledWith('car-123', {
        avatarId: 'avatar-new'
      })
    })

    it('should set error and throw on update failure', async () => {
      const errorMessage = 'Failed to update user car'
      vi.mocked(apiModule.api.updateUserCar).mockRejectedValue(new Error(errorMessage))

      await expect(
        useUserCarsStore.getState().updateUserCar('car-123', { name: 'New Name' })
      ).rejects.toThrow(errorMessage)

      const { error } = useUserCarsStore.getState()
      expect(error).toBe(errorMessage)
    })

    it('should handle updating non-existent car gracefully', async () => {
      useUserCarsStore.setState({ userCars: [mockUserCar] })
      vi.mocked(apiModule.api.updateUserCar).mockResolvedValue({ userCar: mockUserCar2 })

      await useUserCarsStore.getState().updateUserCar('car-nonexistent', { name: 'Test' })

      const { userCars } = useUserCarsStore.getState()
      // Car is not found in the list, so map doesn't replace anything
      // The list remains unchanged with the original car
      expect(userCars).toHaveLength(1)
      expect(userCars[0]).toEqual(mockUserCar)
    })
  })

  describe('deleteUserCar', () => {
    it('should remove user car from list', async () => {
      useUserCarsStore.setState({ userCars: [mockUserCar, mockUserCar2] })
      vi.mocked(apiModule.api.deleteUserCar).mockResolvedValue({ message: 'Deleted' })

      await useUserCarsStore.getState().deleteUserCar('car-123')

      const { userCars, loading, error } = useUserCarsStore.getState()
      expect(userCars).not.toContainEqual(mockUserCar)
      expect(userCars).toContainEqual(mockUserCar2)
      expect(loading).toBe(false)
      expect(error).toBeNull()
    })

    it('should handle deleting only car in list', async () => {
      useUserCarsStore.setState({ userCars: [mockUserCar] })
      vi.mocked(apiModule.api.deleteUserCar).mockResolvedValue({ message: 'Deleted' })

      await useUserCarsStore.getState().deleteUserCar('car-123')

      const { userCars } = useUserCarsStore.getState()
      expect(userCars).toEqual([])
    })

    it('should set error and throw on delete failure', async () => {
      const errorMessage = 'Failed to delete user car'
      vi.mocked(apiModule.api.deleteUserCar).mockRejectedValue(new Error(errorMessage))

      await expect(
        useUserCarsStore.getState().deleteUserCar('car-123')
      ).rejects.toThrow(errorMessage)

      const { error, loading } = useUserCarsStore.getState()
      expect(error).toBe(errorMessage)
      expect(loading).toBe(false)
    })

    it('should handle deleting non-existent car gracefully', async () => {
      useUserCarsStore.setState({ userCars: [mockUserCar] })
      vi.mocked(apiModule.api.deleteUserCar).mockResolvedValue({ message: 'Deleted' })

      await useUserCarsStore.getState().deleteUserCar('car-nonexistent')

      const { userCars } = useUserCarsStore.getState()
      expect(userCars).toEqual([mockUserCar])
    })

    it('should set loading to true during deletion', async () => {
      vi.mocked(apiModule.api.deleteUserCar).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ message: 'Deleted' }), 100))
      )

      const promise = useUserCarsStore.getState().deleteUserCar('car-123')
      const { loading } = useUserCarsStore.getState()
      expect(loading).toBe(true)

      await promise
    })
  })

  describe('Error handling', () => {
    it('should preserve error state until next operation', async () => {
      const errorMessage = 'Test error'
      vi.mocked(apiModule.api.getUserCars).mockRejectedValue(new Error(errorMessage))

      await useUserCarsStore.getState().fetchUserCars()

      const { error } = useUserCarsStore.getState()
      expect(error).toBe(errorMessage)
    })

    it('should clear error on successful operation after failure', async () => {
      useUserCarsStore.setState({ error: 'Previous error' })
      vi.mocked(apiModule.api.getUserCars).mockResolvedValue({ userCars: [] })

      await useUserCarsStore.getState().fetchUserCars()

      const { error } = useUserCarsStore.getState()
      expect(error).toBeNull()
    })
  })
})
