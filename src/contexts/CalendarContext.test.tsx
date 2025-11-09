import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { supabase } from '../lib/supabase'
import { CalendarProvider, useCalendar } from './CalendarContext'

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Mock Supabase client factory function
const createMockSupabase = () => {
  const mockSelect = vi.fn()
  const mockEq = vi.fn()
  const mockDelete = vi.fn()
  const mockInsert = vi.fn()

  mockEq.mockResolvedValue({ data: [], error: null })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  mockInsert.mockResolvedValue({ error: null })

  return {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      delete: mockDelete,
      insert: mockInsert,
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    _mockSelect: mockSelect,
    _mockEq: mockEq,
    _mockDelete: mockDelete,
    _mockInsert: mockInsert,
  }
}

describe('CalendarContext', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element

  beforeEach(() => {
    localStorage.clear()
    mockSupabase = createMockSupabase()
    wrapper = ({ children }: { children: ReactNode }) => (
      <CalendarProvider
        supabaseClient={mockSupabase as unknown as typeof supabase}
      >
        {children}
      </CalendarProvider>
    )
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have default initial values', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      expect(result.current.events).toEqual([])
      expect(result.current.playerName).toBe('')
      expect(result.current.currentUser).toBe('')
      expect(result.current.viewMode).toBe('all')
      expect(result.current.loading).toBe(true) // starts true, then loads
      expect(result.current.error).toBeNull()
      expect(result.current.isDragging).toBe(false)
      expect(result.current.dragStart).toBeNull()
      expect(result.current.dragEnd).toBeNull()
      expect(result.current.SESSION_DURATION).toBe(3)
      expect(result.current.showPlayerModal).toBe(true) // starts true when no currentUser
    })

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = vi.fn()

      expect(() => {
        renderHook(() => useCalendar())
      }).toThrow('useCalendar must be used within a CalendarProvider')

      console.error = originalError
    })
  })

  describe('Player Name Management', () => {
    it('should update player name', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      expect(result.current.playerName).toBe('TestPlayer')
    })
  })

  describe('Current User Management', () => {
    it('should update current user and save to localStorage', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      act(() => {
        result.current.setCurrentUser('TestPlayer')
      })

      expect(result.current.currentUser).toBe('TestPlayer')
      expect(localStorage.getItem('agendaAssist_currentUser')).toBe(
        'TestPlayer'
      )
      expect(result.current.showPlayerModal).toBe(false)
      expect(result.current.playerName).toBe('TestPlayer')
    })

    it('should load current user from localStorage on initialization', () => {
      localStorage.setItem('agendaAssist_currentUser', 'StoredPlayer')

      const { result } = renderHook(() => useCalendar(), { wrapper })

      expect(result.current.currentUser).toBe('StoredPlayer')
      expect(result.current.showPlayerModal).toBe(false)
    })

    it('should show player modal when no current user is set', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      expect(result.current.currentUser).toBe('')
      expect(result.current.showPlayerModal).toBe(true)
    })
  })

  describe('View Mode Management', () => {
    it('should update view mode', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      act(() => {
        result.current.setViewMode('personal')
      })

      expect(result.current.viewMode).toBe('personal')
    })

    it('should reload sessions when view mode changes', async () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      // Reset the call count
      mockSupabase._mockSelect.mockClear()

      act(() => {
        result.current.setViewMode('personal')
      })

      await waitFor(
        () => {
          expect(mockSupabase._mockSelect).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Session Loading', () => {
    it('should load sessions from Supabase', async () => {
      const mockData = [
        {
          id: '1',
          day: 0,
          start_hour: 10,
          duration: 3,
          title: 'Test Session',
          player_name: 'Player1',
        },
      ]

      // Recreate mock with custom data
      mockSupabase._mockEq.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      expect(result.current.events).toHaveLength(1)
      expect(result.current.events[0]).toEqual({
        id: '1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Test Session',
        player_name: 'Player1',
      })
    })

    it('should handle load errors', async () => {
      const mockError = new Error('Network error')

      mockSupabase._mockEq.mockResolvedValue({ data: null, error: mockError })

      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      expect(result.current.error).toBe('view.error')
    })

    it('should filter by player name in personal view', async () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      // Clear previous calls
      mockSupabase._mockEq.mockClear()

      act(() => {
        result.current.setPlayerName('TestPlayer')
        result.current.setViewMode('personal')
      })

      await waitFor(
        () => {
          expect(mockSupabase._mockEq).toHaveBeenCalledWith(
            'player_name',
            'TestPlayer'
          )
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Drag Interactions', () => {
    it('should start dragging when mouse down with valid player name', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.isDragging).toBe(true)
      expect(result.current.dragStart).toEqual({ day: 0, hour: 10 })
      expect(result.current.dragEnd).toEqual({ day: 0, hour: 10 })
    })

    it('should not start dragging with invalid player name', () => {
      // Mock alert
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const { result } = renderHook(() => useCalendar(), { wrapper })

      act(() => {
        result.current.setPlayerName('AB') // Less than 3 characters
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.isDragging).toBe(false)
      expect(alertMock).toHaveBeenCalledWith('player.minLengthError')

      alertMock.mockRestore()
    })

    it('should update drag end when mouse enters during drag', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 12)
      })

      expect(result.current.dragEnd).toEqual({ day: 0, hour: 12 })
    })

    it('should not update drag end when not dragging', () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      act(() => {
        result.current.handleMouseEnter(0, 12)
      })

      expect(result.current.dragEnd).toBeNull()
    })
  })

  describe('Event Creation (Single Click)', () => {
    it('should create a new event on single click on empty cell', async () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      // Simulate single click (mouse down and up on same cell)
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(1)
      expect(result.current.events[0].day).toBe(0)
      expect(result.current.events[0].startHour).toBe(10)
      expect(result.current.events[0].duration).toBe(3)
      expect(result.current.events[0].player_name).toBe('TestPlayer')

      // Check that save is scheduled
      expect(result.current.saveCountdown).not.toBeNull()
    })

    it('should delete an event on single click on occupied cell', async () => {
      const mockData = [
        {
          id: '1',
          day: 0,
          start_hour: 10,
          duration: 3,
          title: 'Test Session',
          player_name: 'Player1',
        },
      ]

      mockSupabase._mockEq.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      expect(result.current.events).toHaveLength(1)

      act(() => {
        result.current.setPlayerName('Player1')
      })

      // Click on the existing event
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(0)
      expect(result.current.pendingChanges.toDelete).toContain('1')
    })
  })

  describe('Event Creation (Drag)', () => {
    it('should create multiple events when dragging on empty cells', async () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      // Simulate drag from (0, 10) to (0, 11)
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseEnter(0, 10.5)
        result.current.handleMouseEnter(0, 11)
        result.current.handleMouseUp()
      })

      // Should create 3 events (10, 10.5, 11)
      expect(result.current.events.length).toBeGreaterThanOrEqual(3)
      expect(
        result.current.pendingChanges.toCreate.length
      ).toBeGreaterThanOrEqual(3)
    })

    it('should delete multiple events when dragging from occupied cell', async () => {
      const mockData = [
        {
          id: '1',
          day: 0,
          start_hour: 10,
          duration: 3,
          title: 'Session 1',
          player_name: 'Player1',
        },
        {
          id: '2',
          day: 0,
          start_hour: 10.5,
          duration: 3,
          title: 'Session 2',
          player_name: 'Player1',
        },
        {
          id: '3',
          day: 0,
          start_hour: 11,
          duration: 3,
          title: 'Session 3',
          player_name: 'Player1',
        },
      ]

      mockSupabase._mockEq.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      expect(result.current.events).toHaveLength(3)

      act(() => {
        result.current.setPlayerName('Player1')
      })

      // Drag from occupied cell
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseEnter(0, 11)
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(0)
      expect(result.current.pendingChanges.toDelete).toContain('1')
      expect(result.current.pendingChanges.toDelete).toContain('2')
      expect(result.current.pendingChanges.toDelete).toContain('3')
    })
  })

  describe('Debounced Save', () => {
    it('should schedule save with countdown after event creation', async () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      // Create an event
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseUp()
      })

      // Check that save countdown was initiated
      await waitFor(
        () => {
          expect(result.current.saveCountdown).not.toBeNull()
        },
        { timeout: 1000 }
      )
    })

    it('should reset countdown when another change is made', async () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      // Create first event
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseUp()
      })

      await waitFor(
        () => {
          expect(result.current.saveCountdown).not.toBeNull()
        },
        { timeout: 1000 }
      )

      // Create another event (should reset countdown)
      act(() => {
        result.current.handleMouseDown(0, 11)
        result.current.handleMouseUp()
      })

      // Should have 2 events pending
      expect(result.current.pendingChanges.toCreate).toHaveLength(2)
    })

    it('should show pending changes after event creation', async () => {
      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      // Create an event
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseUp()
      })

      expect(result.current.pendingChanges.toCreate).toHaveLength(1)
      expect(result.current.pendingChanges.toCreate[0]).toMatchObject({
        day: 0,
        startHour: 10,
        duration: 3,
        player_name: 'TestPlayer',
      })
    })

    it('should show pending changes for deletes', async () => {
      const mockData = [
        {
          id: 'test-1',
          day: 0,
          start_hour: 10,
          duration: 3,
          title: 'Test Session',
          player_name: 'TestPlayer',
        },
      ]

      mockSupabase._mockEq.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      // Delete the event
      act(() => {
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseUp()
      })

      expect(result.current.pendingChanges.toDelete).toContain('test-1')
    })
  })

  describe('Filtered Events', () => {
    it('should return all events in "all" view mode', async () => {
      const mockData = [
        {
          id: '1',
          day: 0,
          start_hour: 10,
          duration: 3,
          title: 'Session 1',
          player_name: 'Player1',
        },
        {
          id: '2',
          day: 0,
          start_hour: 11,
          duration: 3,
          title: 'Session 2',
          player_name: 'Player2',
        },
      ]

      mockSupabase._mockEq.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      const filtered = result.current.getFilteredEvents()
      expect(filtered).toHaveLength(2)
    })

    it('should filter events by player name in "personal" view mode', async () => {
      const mockData = [
        {
          id: '1',
          day: 0,
          start_hour: 10,
          duration: 3,
          title: 'Session 1',
          player_name: 'Player1',
        },
        {
          id: '2',
          day: 0,
          start_hour: 11,
          duration: 3,
          title: 'Session 2',
          player_name: 'Player2',
        },
      ]

      mockSupabase._mockEq.mockResolvedValue({ data: mockData, error: null })

      const { result } = renderHook(() => useCalendar(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        { timeout: 3000 }
      )

      act(() => {
        result.current.setPlayerName('Player1')
        result.current.setViewMode('personal')
      })

      await waitFor(
        () => {
          const filtered = result.current.getFilteredEvents()
          expect(filtered).toHaveLength(1)
          expect(filtered[0].player_name).toBe('Player1')
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Real-time Subscription', () => {
    it('should set up subscription on mount', () => {
      renderHook(() => useCalendar(), { wrapper })

      expect(mockSupabase.channel).toHaveBeenCalledWith('sessions-changes')
    })

    it('should clean up subscription on unmount', () => {
      const { unmount } = renderHook(() => useCalendar(), { wrapper })

      unmount()

      expect(mockSupabase.removeChannel).toHaveBeenCalled()
    })
  })
})
