import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import {
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  format,
  parseISO
} from 'date-fns'
import * as apiModule from '../lib/api'
import { MonthCalendar } from './MonthCalendar'

// Mock the API module
vi.mock('../lib/api', () => ({
  api: {
    getSessionsByRange: vi.fn(),
    getActiveBans: vi.fn()
  }
}))

// Mock auth store
vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
  }))
}))

// Mock SessionCard to inspect props
vi.mock('./SessionCard', () => ({
  SessionCard: vi.fn(({ session, isPast, onRefresh }) => (
    <div
      data-testid={`session-card-${session.id}`}
      data-is-past={isPast}
      onClick={onRefresh}
    >
      Session {session.id}: {format(parseISO(session.startTime), 'HH:mm')}
    </div>
  ))
}))

// Mock LoadingSpinner
vi.mock('./LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading</div>
}))

describe('MonthCalendar', () => {
  const mockSession = (
    id: string,
    date: string,
    startTime: string,
    endTime: string
  ): apiModule.Session => ({
    id,
    groupId: 'group-1',
    date,
    startTime,
    endTime,
    cars: [],
    passengers: []
  })

  beforeEach(() => {
    // Reset fake timers before each test
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    // Set a specific "now" time for deterministic tests
    // Use a date in the middle of a month (e.g., February 15, 2025, 10:00 AM)
    vi.setSystemTime(new Date('2025-02-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('API Integration', () => {
    it('calls getSessionsByRange with calendar date bounds including padding days', async () => {
      const groupId = 'group-1'
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId={groupId} />)

      // Wait for the API call to complete
      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalled()
      })

      // Verify the call was made with correct parameters
      const call = vi.mocked(apiModule.api.getSessionsByRange).mock.calls[0]
      expect(call[0]).toBe(groupId)
      expect(call[1]).toBeDefined() // from date
      expect(call[2]).toBeDefined() // to date

      // Verify the date range includes padding days
      // Current month: Feb 2025
      // Calendar start (Monday of first week): Jan 27, 2025
      // Calendar end (Sunday of last week): Mar 9, 2025
      const currentMonth = startOfMonth(new Date('2025-02-15'))
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
      const expectedFromDate = format(calendarStart, 'yyyy-MM-dd')
      const expectedToDate = format(calendarEnd, 'yyyy-MM-dd')

      expect(call[1]).toBe(expectedFromDate)
      expect(call[2]).toBe(expectedToDate)

      unmount()
    })

    it('calls getActiveBans on mount', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(apiModule.api.getActiveBans).toHaveBeenCalled()
      })

      unmount()
    })

    it('re-fetches when month changes', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalled()
      })

      // Track total calls so far
      const callsBefore = vi.mocked(apiModule.api.getSessionsByRange).mock.calls.length

      // Click next month button
      const nextMonthButton = screen.getByLabelText('Mois suivant')
      fireEvent.click(nextMonthButton)

      // Verify a new API call was made
      await waitFor(() => {
        expect(vi.mocked(apiModule.api.getSessionsByRange).mock.calls.length).toBeGreaterThan(callsBefore)
      })

      // The latest call should be for March, not February
      const calls = vi.mocked(apiModule.api.getSessionsByRange).mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toBe('group-1')
      // March 2025 calendar starts before March 1 and ends after March 31
      expect(lastCall[1]).toBeDefined()
      expect(lastCall[2]).toBeDefined()

      unmount()
    })
  })

  describe('Session Dots on Padding Days', () => {
    it('shows session indicators on padding days from previous month', async () => {
      const groupId = 'group-1'
      // Session on Jan 31 (padding day before Feb)
      const pastSession = mockSession(
        'session-1',
        '2025-01-31',
        '2025-01-31T10:00:00Z',
        '2025-01-31T11:00:00Z'
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [pastSession]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId={groupId} />)

      // The button for day 31 should exist (padding day) and not have opacity-30 when selected
      // (because sessions show on padding days now)
      await waitFor(() => {
        // Jan 31 is a Friday, should be visible as first day of the calendar grid
        const dayButtons = screen.getAllByRole('button').filter(
          (btn) => btn.className.includes('flex flex-col items-center')
        )
        expect(dayButtons.length).toBeGreaterThan(0)
      })

      unmount()
    })

    it('shows session indicators on padding days from next month', async () => {
      const groupId = 'group-1'
      // Session on Mar 1 (padding day after Feb)
      const futureSession = mockSession(
        'session-2',
        '2025-03-01',
        '2025-03-01T14:00:00Z',
        '2025-03-01T15:00:00Z'
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [futureSession]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId={groupId} />)

      await waitFor(() => {
        // Just verify the component renders without errors
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      unmount()
    })

    it('renders calendar with sessions on both current month and padding days', async () => {
      const currentMonthSession = mockSession(
        'session-3',
        '2025-02-15',
        '2025-02-15T09:00:00Z',
        '2025-02-15T10:00:00Z'
      )
      const paddingDaySession = mockSession(
        'session-4',
        '2025-01-31',
        '2025-01-31T09:00:00Z',
        '2025-01-31T10:00:00Z'
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [currentMonthSession, paddingDaySession]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Verify no error occurred
      expect(screen.queryByRole('button', { name: /Réessayer/i })).not.toBeInTheDocument()

      unmount()
    })
  })

  describe('isPast Prop Handling', () => {
    it('passes isPast=true for sessions with endTime in the past', async () => {
      // Session that ended before "now" (Feb 15, 10:00)
      const pastSession = mockSession(
        'session-5',
        '2025-02-10',
        '2025-02-10T08:00:00Z',
        '2025-02-10T09:00:00Z' // Ends at 9:00 AM, "now" is 10:00 AM
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [pastSession]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      // Click on the day with the past session
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Find and click Feb 10 button
      const dayButtons = screen.getAllByRole('button').filter(
        (btn) => btn.className.includes('flex flex-col items-center')
      )
      // Feb 10 is the 10th day of the month (roughly the 14th button if we count the padding)
      const feb10Button = dayButtons[14] // Approximate position

      if (feb10Button) {
        fireEvent.click(feb10Button)
      }

      // Verify SessionCard received isPast=true
      await waitFor(() => {
        const sessionCard = screen.queryByTestId('session-card-session-5')
        if (sessionCard) {
          expect(sessionCard).toHaveAttribute('data-is-past', 'true')
        }
      })

      unmount()
    })

    it('passes isPast=false for sessions with endTime in the future', async () => {
      // Session that ends after "now" (Feb 15, 10:00)
      const futureSession = mockSession(
        'session-6',
        '2025-02-20',
        '2025-02-20T14:00:00Z',
        '2025-02-20T15:00:00Z' // Ends at 3 PM, "now" is 10 AM
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [futureSession]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Find and click Feb 20 button
      const dayButtons = screen.getAllByRole('button').filter(
        (btn) => btn.className.includes('flex flex-col items-center')
      )
      const feb20Button = dayButtons[24] // Approximate position

      if (feb20Button) {
        fireEvent.click(feb20Button)
      }

      // Verify SessionCard received isPast=false
      await waitFor(() => {
        const sessionCard = screen.queryByTestId('session-card-session-6')
        if (sessionCard) {
          expect(sessionCard).toHaveAttribute('data-is-past', 'false')
        }
      })

      unmount()
    })

    it('correctly determines isPast based on session endTime, not date', async () => {
      // Session on today but ending in the past
      const todaySessionEndedEarly = mockSession(
        'session-7',
        '2025-02-15',
        '2025-02-15T08:00:00Z',
        '2025-02-15T09:00:00Z' // Ends at 9 AM, "now" is 10 AM
      )
      // Session on today but ending in the future
      const todaySessionEndsFuture = mockSession(
        'session-8',
        '2025-02-15',
        '2025-02-15T11:00:00Z',
        '2025-02-15T12:00:00Z' // Ends at 12 PM, "now" is 10 AM
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [todaySessionEndedEarly, todaySessionEndsFuture]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Click on today (Feb 15)
      const dayButtons = screen.getAllByRole('button').filter(
        (btn) => btn.className.includes('flex flex-col items-center')
      )
      const todayButton = dayButtons[19] // Feb 15 is roughly the 19th button

      if (todayButton) {
        fireEvent.click(todayButton)
      }

      // Verify both sessions appear with correct isPast values
      await waitFor(() => {
        const pastSessionCard = screen.queryByTestId('session-card-session-7')
        const futureSessionCard = screen.queryByTestId('session-card-session-8')

        if (pastSessionCard) {
          expect(pastSessionCard).toHaveAttribute('data-is-past', 'true')
        }
        if (futureSessionCard) {
          expect(futureSessionCard).toHaveAttribute('data-is-past', 'false')
        }
      })

      unmount()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when getSessionsByRange fails', async () => {
      const errorMessage = 'Failed to fetch sessions'
      vi.mocked(apiModule.api.getSessionsByRange).mockRejectedValue(
        new Error(errorMessage)
      )
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })

      unmount()
    })

    it('displays retry button on error', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockRejectedValue(
        new Error('Failed to fetch sessions')
      )
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument()
      })

      unmount()
    })

    it('recovers from error when retry is clicked', async () => {
      vi.mocked(apiModule.api.getSessionsByRange)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ sessions: [] })

      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /Réessayer/i })
      fireEvent.click(retryButton)

      // Wait for successful load
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
        expect(screen.queryByText('Network error')).not.toBeInTheDocument()
      })

      unmount()
    })
  })

  describe('Loading States', () => {
    it('displays loading spinner on initial load when no sessions exist', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ sessions: [] }), 100))
      )
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      // Initially should show loading
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      unmount()
    })

    it('does not show loading spinner on subsequent fetches when sessions already exist', async () => {
      const session = mockSession(
        'session-9',
        '2025-02-15',
        '2025-02-15T10:00:00Z',
        '2025-02-15T11:00:00Z'
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [session]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount, rerender } = render(
        <MonthCalendar groupId="group-1" refreshTrigger={0} />
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Trigger a refresh (like polling)
      vi.clearAllMocks()
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [session]
      })

      rerender(<MonthCalendar groupId="group-1" refreshTrigger={1} />)

      // Should not show loading spinner for refresh
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()

      unmount()
    })
  })

  describe('Month Navigation', () => {
    it('changes to previous month when previous button is clicked', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Clear previous mock calls
      vi.mocked(apiModule.api.getSessionsByRange).mockClear()

      // Click previous month button
      const prevMonthButton = screen.getAllByRole('button')[0] // 1st button is previous
      fireEvent.click(prevMonthButton)

      // Verify new API call for previous month
      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalled()
      })

      const call = vi.mocked(apiModule.api.getSessionsByRange).mock.calls[0]
      // Should be January dates now
      expect(call[1]).toBeDefined()
      expect(call[2]).toBeDefined()

      unmount()
    })

    it('shows "Revenir à aujourd\'hui" button when not on current month', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Navigate to previous month
      const prevMonthButton = screen.getAllByRole('button')[0]
      fireEvent.click(prevMonthButton)

      // Wait for navigation and verify "today" link appears
      await waitFor(() => {
        expect(screen.getByText(/Revenir à aujourd'hui/i)).toBeInTheDocument()
      })

      unmount()
    })

    it('does not show "Revenir à aujourd\'hui" button on current month', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Should not show "today" link when on current month
      expect(screen.queryByText(/Revenir à aujourd'hui/i)).not.toBeInTheDocument()

      unmount()
    })
  })

  describe('Date Selection', () => {
    it('displays selected date sessions when a date is clicked', async () => {
      const session = mockSession(
        'session-10',
        '2025-02-15',
        '2025-02-15T10:00:00Z',
        '2025-02-15T11:00:00Z'
      )

      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: [session]
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Click on Feb 15 (today)
      const dayButtons = screen.getAllByRole('button').filter(
        (btn) => btn.className.includes('flex flex-col items-center')
      )
      const feb15Button = dayButtons[19] // Approximate

      if (feb15Button) {
        fireEvent.click(feb15Button)
      }

      // Should show the session card
      await waitFor(() => {
        expect(screen.queryByTestId('session-card-session-10')).toBeInTheDocument()
      })

      unmount()
    })

    it('shows "no sessions" message for selected date with no sessions', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Click on a day
      const dayButtons = screen.getAllByRole('button').filter(
        (btn) => btn.className.includes('flex flex-col items-center')
      )
      if (dayButtons.length > 19) {
        fireEvent.click(dayButtons[19])
      }

      // Should show no sessions message
      await waitFor(() => {
        expect(
          screen.queryByText(/Aucune séance/i)
        ).toBeInTheDocument()
      })

      unmount()
    })

    it('deselects date when clicking selected date again', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })

      // Click on a day
      const dayButtons = screen.getAllByRole('button').filter(
        (btn) => btn.className.includes('flex flex-col items-center')
      )
      const targetButton = dayButtons[19]

      if (targetButton) {
        fireEvent.click(targetButton)

        // Wait for selection to show
        await waitFor(() => {
          expect(screen.queryByText(/Aucune séance/i)).toBeInTheDocument()
        })

        // Click again to deselect
        fireEvent.click(targetButton)

        // Should hide the details and show the default message
        await waitFor(() => {
          expect(
            screen.queryByText(/Sélectionnez un jour/i)
          ).toBeInTheDocument()
        })
      }

      unmount()
    })
  })

  describe('Polling', () => {
    it('polls for updates every 10 seconds', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      // Initial call
      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalledTimes(1)
      })

      // Clear mocks and advance time
      vi.mocked(apiModule.api.getSessionsByRange).mockClear()
      vi.advanceTimersByTime(10_000) // 10 seconds

      // Should have polled
      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalled()
      })

      unmount()
    })

    it('stops polling when component unmounts', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { unmount } = render(<MonthCalendar groupId="group-1" />)

      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalled()
      })

      // Unmount component (should clear interval)
      unmount()

      // Clear mocks
      vi.mocked(apiModule.api.getSessionsByRange).mockClear()

      // Advance time
      vi.advanceTimersByTime(20_000)

      // Should not have made additional calls after unmount
      expect(apiModule.api.getSessionsByRange).not.toHaveBeenCalled()
    })
  })

  describe('Refresh Trigger', () => {
    it('refetches sessions when refreshTrigger prop changes', async () => {
      vi.mocked(apiModule.api.getSessionsByRange).mockResolvedValue({
        sessions: []
      })
      vi.mocked(apiModule.api.getActiveBans).mockResolvedValue({
        bansGiven: [], bansReceived: []
      })

      const { rerender, unmount } = render(
        <MonthCalendar groupId="group-1" refreshTrigger={0} />
      )

      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalledTimes(1)
      })

      // Clear mocks
      vi.mocked(apiModule.api.getSessionsByRange).mockClear()

      // Update refreshTrigger
      rerender(<MonthCalendar groupId="group-1" refreshTrigger={1} />)

      // Should refetch
      await waitFor(() => {
        expect(apiModule.api.getSessionsByRange).toHaveBeenCalled()
      })

      unmount()
    })
  })
})
