const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ApiError {
  error: string
  code?: string
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'Something went wrong')
  }
  return response.json()
}

export const api = {
  // Auth
  async googleAuth(credential: string) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
      credentials: 'include'
    })
    return handleResponse<{ user: User; token: string }>(res)
  },

  async requestMagicLink(email: string, name?: string) {
    const res = await fetch(`${API_BASE}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async verifyMagicLink(token: string) {
    const res = await fetch(`${API_BASE}/auth/magic-link/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      credentials: 'include'
    })
    return handleResponse<{ user: User; token: string }>(res)
  },

  async devLogin(name: string) {
    const res = await fetch(`${API_BASE}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include'
    })
    return handleResponse<{ user: User; token: string }>(res)
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    })
    return handleResponse<{ user: User | null }>(res)
  },

  async logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  // Users
  async updateProfile(data: { name?: string; avatarId?: string | null; customAvatarUrl?: string | null }) {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    })
    return handleResponse<{ user: User }>(res)
  },

  // Avatars
  async getAvatars() {
    const res = await fetch(`${API_BASE}/avatars`, {
      credentials: 'include'
    })
    return handleResponse<{ avatars: Avatar[] }>(res)
  },

  // Groups
  async getGroups() {
    const res = await fetch(`${API_BASE}/groups`, {
      credentials: 'include'
    })
    return handleResponse<{ groups: Group[] }>(res)
  },

  async getGroup(id: string) {
    const res = await fetch(`${API_BASE}/groups/${id}`, {
      credentials: 'include'
    })
    return handleResponse<{ group: Group; role: string }>(res)
  },

  async createGroup(name: string) {
    const res = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include'
    })
    return handleResponse<{ group: Group }>(res)
  },

  async joinGroup(inviteCode: string) {
    const res = await fetch(`${API_BASE}/groups/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode }),
      credentials: 'include'
    })
    return handleResponse<{ group: Group }>(res)
  },

  async leaveGroup(groupId: string) {
    const res = await fetch(`${API_BASE}/groups/${groupId}/leave`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async updateGroup(id: string, data: { name?: string; avatarId?: string | null }) {
    const res = await fetch(`${API_BASE}/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    })
    return handleResponse<{ group: Group }>(res)
  },

  async deleteGroup(id: string) {
    const res = await fetch(`${API_BASE}/groups/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  // Sessions
  async getTodaySession(groupId: string) {
    const res = await fetch(`${API_BASE}/sessions/today/${groupId}`, {
      credentials: 'include'
    })
    return handleResponse<{ session: Session }>(res)
  },

  async getUpcomingSessions(groupId: string, limit: number = 10, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (cursor) params.append('cursor', cursor)
    const res = await fetch(`${API_BASE}/sessions/upcoming/${groupId}?${params}`, {
      credentials: 'include'
    })
    return handleResponse<{ sessions: Session[]; hasMore: boolean; nextCursor?: string }>(res)
  },

  async getSession(id: string) {
    const res = await fetch(`${API_BASE}/sessions/${id}`, {
      credentials: 'include'
    })
    return handleResponse<{ session: Session }>(res)
  },

  async getSessionLockStatus(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/lock-status`, {
      credentials: 'include'
    })
    return handleResponse<{ isLocked: boolean; canModify: boolean; locksAt: string }>(res)
  },

  async joinSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/join`, {
      method: 'POST',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async leaveSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/leave`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async cancelSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string; hadParticipants: boolean }>(res)
  },

  async updateSession(sessionId: string, data: {
    startTime: string
    endTime: string
    scope?: 'single' | 'future'
  }) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    })
    return handleResponse<{
      session?: Session
      message?: string
      updatedCount?: number
      detachedFromPattern?: boolean
    }>(res)
  },

  // Cars
  async addCar(sessionId: string, seats?: number, userCarId?: string) {
    const res = await fetch(`${API_BASE}/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, seats, userCarId }),
      credentials: 'include'
    })
    return handleResponse<{ car: Car }>(res)
  },

  async updateCar(carId: string, seats: number) {
    const res = await fetch(`${API_BASE}/cars/${carId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seats }),
      credentials: 'include'
    })
    return handleResponse<{ car: Car }>(res)
  },

  async removeCar(carId: string) {
    const res = await fetch(`${API_BASE}/cars/${carId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async joinCar(carId: string) {
    const res = await fetch(`${API_BASE}/cars/${carId}/join`, {
      method: 'POST',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async leaveCar(carId: string) {
    const res = await fetch(`${API_BASE}/cars/${carId}/leave`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async kickPassenger(carId: string, userId: string) {
    const res = await fetch(`${API_BASE}/cars/${carId}/kick/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  // Bans
  async getActiveBans() {
    const res = await fetch(`${API_BASE}/bans/active`, {
      credentials: 'include'
    })
    return handleResponse<{ bansGiven: Ban[]; bansReceived: Ban[] }>(res)
  },

  async getHallOfFame() {
    const res = await fetch(`${API_BASE}/bans/hall-of-fame`, {
      credentials: 'include'
    })
    return handleResponse<{ hallOfFame: HallOfFame }>(res)
  },

  async createBan(receiverId: string, duration: string, reason?: string) {
    const res = await fetch(`${API_BASE}/bans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId, duration, reason }),
      credentials: 'include'
    })
    return handleResponse<{ ban: Ban }>(res)
  },

  async liftBan(banId: string) {
    const res = await fetch(`${API_BASE}/bans/${banId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  async checkBan(giverId: string) {
    const res = await fetch(`${API_BASE}/bans/check/${giverId}`, {
      credentials: 'include'
    })
    return handleResponse<{ banned: boolean; ban: Ban | null }>(res)
  },

  // User Cars
  async getUserCars() {
    const res = await fetch(`${API_BASE}/user-cars`, {
      credentials: 'include'
    })
    return handleResponse<{ userCars: UserCar[] }>(res)
  },

  async createUserCar(data: { name?: string; avatarId: string; defaultSeats?: number }) {
    const res = await fetch(`${API_BASE}/user-cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    })
    return handleResponse<{ userCar: UserCar }>(res)
  },

  async updateUserCar(id: string, data: { name?: string | null; avatarId?: string; defaultSeats?: number }) {
    const res = await fetch(`${API_BASE}/user-cars/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    })
    return handleResponse<{ userCar: UserCar }>(res)
  },

  async deleteUserCar(id: string) {
    const res = await fetch(`${API_BASE}/user-cars/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  },

  // Recurrence Patterns
  async getRecurrencePatterns(groupId: string) {
    const res = await fetch(`${API_BASE}/groups/${groupId}/recurrence-patterns`, {
      credentials: 'include'
    })
    return handleResponse<{ patterns: RecurrencePattern[] }>(res)
  },

  async createRecurrencePattern(groupId: string, data: {
    startTime: string
    endTime: string
    daysOfWeek: number[]
    startDate: string
    endDate?: string
  }) {
    const res = await fetch(`${API_BASE}/groups/${groupId}/recurrence-patterns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    })
    return handleResponse<{ pattern: RecurrencePattern; sessionsCreated: number }>(res)
  },

  async deleteRecurrencePattern(patternId: string, deleteFutureSessions: boolean = false) {
    const res = await fetch(`${API_BASE}/recurrence-patterns/${patternId}?deleteFutureSessions=${deleteFutureSessions}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return handleResponse<{ message: string }>(res)
  }
}

// Types
export interface Avatar {
  id: string
  name: string
  imageUrl: string
  category?: string
}

export interface User {
  id: string
  email?: string
  name: string
  avatarId?: string
  customAvatarUrl?: string
  avatar?: Avatar
}

export interface GroupMember extends User {
  role: string
  joinedAt: string
}

export interface Group {
  id: string
  name: string
  inviteCode: string
  avatarId?: string
  avatar?: Avatar
  members: GroupMember[]
}

export interface Passenger {
  id: string
  userId: string
  carId?: string
  user: User
  joinedAt: string
}

export interface UserCar {
  id: string
  userId: string
  name?: string
  avatarId: string
  defaultSeats: number
  avatar: Avatar
  createdAt: string
  updatedAt: string
}

export interface Car {
  id: string
  sessionId: string
  driverId: string
  seats: number
  userCarId?: string
  driver: User
  userCar?: UserCar
  passengers: Passenger[]
}

export interface Session {
  id: string
  groupId: string
  date: string
  startTime: string
  endTime: string
  recurrencePatternId?: string
  createdById?: string
  cars: Car[]
  passengers: Passenger[]
}

export interface RecurrencePattern {
  id: string
  groupId: string
  createdById: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  startDate: string
  endDate?: string
  createdAt: string
  createdBy: {
    id: string
    name: string
  }
  _count: {
    sessions: number
  }
}

export interface Ban {
  id: string
  giverId: string
  receiverId: string
  reason?: string
  startsAt: string
  endsAt: string
  giver?: User
  receiver?: User
}

export interface HallOfFame {
  topBanners: { user: User; count: number }[]
  topBanned: { user: User; count: number }[]
}
