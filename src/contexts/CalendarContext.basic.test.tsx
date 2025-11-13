import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CalendarProvider, useCalendar } from './CalendarContext'
import type { ReactNode } from 'react'

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Simple mock Supabase for basic tests
const createBasicMockSupabase = () => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  }),
  removeChannel: vi.fn(),
})

describe('CalendarContext - Basic Functionality', () => {
  let mockSupabase: ReturnType<typeof createBasicMockSupabase>
  
  beforeEach(() => {
    mockSupabase = createBasicMockSupabase()
  })

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <CalendarProvider supabaseClient={mockSupabase as any}>
        {children}
      </CalendarProvider>
    )
    return Wrapper
  }

  describe('Hook Usage', () => {
    it('should throw error when used outside provider', () => {
      const originalError = console.error
      console.error = vi.fn()

      expect(() => {
        renderHook(() => useCalendar())
      }).toThrow('useCalendar must be used within a CalendarProvider')

      console.error = originalError
    })

    it('should provide context when used inside provider', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      expect(result.current).toBeDefined()
      expect(result.current.events).toBeDefined()
      expect(result.current.playerName).toBeDefined()
      expect(result.current.SESSION_DURATION).toBe(3)
    })
  })

  describe('State Management', () => {
    it('should update player name', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      expect(result.current.playerName).toBe('TestPlayer')
    })

    it('should update view mode', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      expect(result.current.viewMode).toBe('all')

      act(() => {
        result.current.setViewMode('personal')
      })

      expect(result.current.viewMode).toBe('personal')
    })
  })

  describe('Drag Operations', () => {
    it('should handle mouse down with valid player name', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('ValidPlayer')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.isDragging).toBe(true)
      expect(result.current.dragStart).toEqual({ day: 0, hour: 10 })
    })

    it('should not start drag with invalid player name', () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('AB') // Less than 3 characters
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.isDragging).toBe(false)
      expect(alertMock).toHaveBeenCalled()

      alertMock.mockRestore()
    })

    it('should update drag position on mouse enter', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('ValidPlayer')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 11)
      })

      expect(result.current.dragEnd).toEqual({ day: 0, hour: 11 })
    })

    it('should end drag on mouse up', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('ValidPlayer')
        result.current.handleMouseDown(0, 10)
        result.current.handleMouseUp()
      })

      expect(result.current.isDragging).toBe(false)
      expect(result.current.dragStart).toBeNull()
      expect(result.current.dragEnd).toBeNull()
    })
  })

  describe('Event Creation', () => {
    it('should create event on single click', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      // Verify playerName is set
      expect(result.current.playerName).toBe('TestPlayer')

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      // Verify drag state is set
      expect(result.current.isDragging).toBe(true)
      expect(result.current.dragStart).toEqual({ day: 0, hour: 10 })
      expect(result.current.dragEnd).toEqual({ day: 0, hour: 10 })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(1)
      expect(result.current.events[0]).toMatchObject({
        day: 0,
        startHour: 10,
        duration: 3,
        player_name: 'TestPlayer',
      })
    })

    it('should add event to pending changes', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.pendingChanges.toCreate).toHaveLength(1)
    })

    it('should create multiple events on drag', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setPlayerName('TestPlayer')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 10.5)
      })

      act(() => {
        result.current.handleMouseEnter(0, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.events.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Filtered Events', () => {
    it('should return all events in "all" view mode', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      // Ensure we're in "all" view mode
      act(() => {
        result.current.setViewMode('all')
      })

      // Create first event
      act(() => {
        result.current.setPlayerName('Player1')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(1)
      
      // Create second event with different player
      act(() => {
        result.current.setPlayerName('Player2')
      })

      act(() => {
        result.current.handleMouseDown(1, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(2)

      const filtered = result.current.getFilteredEvents()
      expect(filtered.length).toBe(2)
    })

    it('should filter by player in personal mode', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      // Create first event for Player1
      act(() => {
        result.current.setPlayerName('Player1')
      })

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(1)
      
      // Create second event for Player2
      act(() => {
        result.current.setPlayerName('Player2')
      })

      act(() => {
        result.current.handleMouseDown(1, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.events).toHaveLength(2)
      
      // Switch to personal mode for Player1
      act(() => {
        result.current.setPlayerName('Player1')
      })

      act(() => {
        result.current.setViewMode('personal')
      })

      const filtered = result.current.getFilteredEvents()
      expect(filtered).toHaveLength(1)
      expect(filtered.every(e => e.player_name === 'Player1')).toBe(true)
    })
  })

  describe('Constants', () => {
    it('should expose SESSION_DURATION constant', () => {
      const { result } = renderHook(() => useCalendar(), {
        wrapper: createWrapper(),
      })

      expect(result.current.SESSION_DURATION).toBe(3)
    })
  })
})

