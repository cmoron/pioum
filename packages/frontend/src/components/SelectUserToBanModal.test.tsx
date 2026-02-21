import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { SelectUserToBanModal } from './SelectUserToBanModal'
import * as apiModule from '@/lib/api'
import type { User, Ban } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    getBannableUsers: vi.fn()
  }
}))

vi.mock('./BanModal', () => ({
  BanModal: ({ user, onClose }: { user: { name: string }; onClose: () => void }) => (
    <div data-testid="ban-modal">
      <span>Banning {user.name}</span>
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

// Avatar renders a placeholder to avoid duplicating user names in the DOM
vi.mock('./Avatar', () => ({
  Avatar: () => <div data-testid="avatar" />
}))

const mockMe: User = { id: 'me-123', name: 'Me', email: 'me@example.com' }

const mockUsers: User[] = [
  { id: 'user-1', name: 'Alice' },
  { id: 'user-2', name: 'Bob' }
]

describe('SelectUserToBanModal', () => {
  const onClose = vi.fn()
  const onUserBanned = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiModule.api.getBannableUsers).mockResolvedValue({ users: mockUsers })
  })

  it('should call getBannableUsers on mount', async () => {
    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={[]}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    expect(apiModule.api.getBannableUsers).toHaveBeenCalledTimes(1)
  })

  it('should display bannable users after loading', async () => {
    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={[]}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('should show "already banned" message for users with an active ban', async () => {
    const bansGiven: Ban[] = [
      {
        id: 'ban-1',
        giverId: 'me-123',
        receiverId: 'user-1',
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString()
      }
    ]

    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={bansGiven}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    expect(screen.getByText('Vous avez déjà banni cette personne')).toBeInTheDocument()
  })

  it('should not show "already banned" message when no active bans', async () => {
    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={[]}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    expect(screen.queryByText('Vous avez déjà banni cette personne')).not.toBeInTheDocument()
  })

  it('should open BanModal when clicking a non-banned user', async () => {
    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={[]}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    fireEvent.click(screen.getByText('Alice').closest('div')!)

    expect(screen.getByTestId('ban-modal')).toBeInTheDocument()
    expect(screen.getByText('Banning Alice')).toBeInTheDocument()
  })

  it('should call onClose when cancel button is clicked', async () => {
    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={[]}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    fireEvent.click(screen.getByText('Annuler'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should not display the current user even if returned by the API', async () => {
    const usersIncludingMe: User[] = [...mockUsers, { id: 'me-123', name: 'ShouldBeHidden' }]
    vi.mocked(apiModule.api.getBannableUsers).mockResolvedValue({ users: usersIncludingMe })

    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={[]}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    expect(screen.queryByText('ShouldBeHidden')).not.toBeInTheDocument()
  })

  it('should show loading state while fetching', async () => {
    let resolve!: (value: { users: User[] }) => void
    vi.mocked(apiModule.api.getBannableUsers).mockReturnValue(
      new Promise(r => { resolve = r })
    )

    render(
      <SelectUserToBanModal
        me={mockMe}
        bansGiven={[]}
        onClose={onClose}
        onUserBanned={onUserBanned}
      />
    )

    // Cancel button is disabled while loading
    expect(screen.getByText('Annuler')).toBeDisabled()

    await act(async () => { resolve({ users: mockUsers }) })

    expect(screen.getByText('Annuler')).not.toBeDisabled()
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(apiModule.api.getBannableUsers).mockRejectedValue(new Error('Network error'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    await act(async () => {
      render(
        <SelectUserToBanModal
          me={mockMe}
          bansGiven={[]}
          onClose={onClose}
          onUserBanned={onUserBanned}
        />
      )
    })

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled()
    })

    alertSpy.mockRestore()
  })
})
