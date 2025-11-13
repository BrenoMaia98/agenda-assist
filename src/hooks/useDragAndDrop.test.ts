import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarEvent, PendingChanges } from '../contexts/types'
import type { UseDragAndDropOptions } from './useDragAndDrop'
import { useDragAndDrop } from './useDragAndDrop'

describe('useDragAndDrop', () => {
  let mockSetPendingChanges: ReturnType<typeof vi.fn>
  let mockScheduleSave: ReturnType<typeof vi.fn>
  let mockT: ReturnType<typeof vi.fn>
  let defaultOptions: UseDragAndDropOptions

  beforeEach(() => {
    mockSetPendingChanges = vi.fn()
    mockScheduleSave = vi.fn()
    mockT = vi.fn((key: string) => key)

    defaultOptions = {
      playerName: 'TestPlayer',
      displayedEvents: [],
      pendingChanges: { toCreate: [], toDelete: [] },
      setPendingChanges: mockSetPendingChanges as unknown as (
        changes: PendingChanges | ((prev: PendingChanges) => PendingChanges)
      ) => void,
      scheduleSave: mockScheduleSave as unknown as () => void,
      SESSION_DURATION: 3,
      t: mockT as unknown as (key: string) => string,
    }
  })

  describe('Initial State', () => {
    it('should initialize with default drag state', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      expect(result.current.isDragging).toBe(false)
      expect(result.current.dragStart).toBeNull()
      expect(result.current.dragEnd).toBeNull()
    })

    it('should provide handler functions', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      expect(typeof result.current.handleMouseDown).toBe('function')
      expect(typeof result.current.handleMouseEnter).toBe('function')
      expect(typeof result.current.handleMouseUp).toBe('function')
    })
  })

  describe('handleMouseDown', () => {
    it('should start dragging with valid player name', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.isDragging).toBe(true)
      expect(result.current.dragStart).toEqual({ day: 0, hour: 10 })
      expect(result.current.dragEnd).toEqual({ day: 0, hour: 10 })
    })

    it('should not start dragging with invalid player name', () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
      const options = { ...defaultOptions, playerName: 'AB' } // Less than 3 chars

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.isDragging).toBe(false)
      expect(alertMock).toHaveBeenCalledWith('player.minLengthError')
      expect(mockT).toHaveBeenCalledWith('player.minLengthError')

      alertMock.mockRestore()
    })

    it('should not start dragging with empty player name', () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
      const options = { ...defaultOptions, playerName: '' }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.isDragging).toBe(false)
      expect(alertMock).toHaveBeenCalled()

      alertMock.mockRestore()
    })

    it('should handle multiple mouse down events', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      expect(result.current.dragStart).toEqual({ day: 0, hour: 10 })

      act(() => {
        result.current.handleMouseDown(1, 12)
      })

      expect(result.current.dragStart).toEqual({ day: 1, hour: 12 })
    })
  })

  describe('handleMouseEnter', () => {
    it('should update drag end when dragging', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 12)
      })

      expect(result.current.dragEnd).toEqual({ day: 0, hour: 12 })
    })

    it('should not update drag end when not dragging', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseEnter(0, 12)
      })

      expect(result.current.dragEnd).toBeNull()
    })

    it('should update drag end multiple times during drag', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 10.5)
      })

      expect(result.current.dragEnd).toEqual({ day: 0, hour: 10.5 })

      act(() => {
        result.current.handleMouseEnter(0, 11)
      })

      expect(result.current.dragEnd).toEqual({ day: 0, hour: 11 })
    })
  })

  describe('handleMouseUp - Single Click (Create)', () => {
    it('should create a new event on single click on empty cell', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).toHaveBeenCalledWith(expect.any(Function))

      // Verify the function passed to setPendingChanges
      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      expect(newState.toCreate).toHaveLength(1)
      expect(newState.toCreate[0]).toMatchObject({
        day: 0,
        startHour: 10,
        duration: 3,
        player_name: 'TestPlayer',
      })
      expect(mockScheduleSave).toHaveBeenCalled()
    })

    it('should reset drag state after mouse up', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(result.current.isDragging).toBe(false)
      expect(result.current.dragStart).toBeNull()
      expect(result.current.dragEnd).toBeNull()
    })

    it('should generate unique event IDs', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).toHaveBeenCalled()
      const firstCall = mockSetPendingChanges.mock.calls[0][0]
      const firstState = firstCall({ toCreate: [], toDelete: [] })
      const firstId = firstState.toCreate[0].id

      mockSetPendingChanges.mockClear()

      act(() => {
        result.current.handleMouseDown(0, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const secondCall = mockSetPendingChanges.mock.calls[0][0]
      const secondState = secondCall({ toCreate: [], toDelete: [] })
      const secondId = secondState.toCreate[0].id

      expect(firstId).not.toBe(secondId)
    })
  })

  describe('handleMouseUp - Single Click (Delete)', () => {
    it('should delete event when clicking on existing session', () => {
      const existingEvent: CalendarEvent = {
        id: 'test-1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Test Session',
        player_name: 'TestPlayer',
      }

      const options = {
        ...defaultOptions,
        displayedEvents: [existingEvent],
      }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).toHaveBeenCalled()

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      expect(newState.toDelete).toContain('test-1')
      expect(mockScheduleSave).toHaveBeenCalled()
    })

    it('should only delete sessions for current player', () => {
      const playerEvent: CalendarEvent = {
        id: 'player-1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Player Session',
        player_name: 'TestPlayer',
      }

      const otherEvent: CalendarEvent = {
        id: 'other-1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Other Session',
        player_name: 'OtherPlayer',
      }

      const options = {
        ...defaultOptions,
        displayedEvents: [playerEvent, otherEvent],
      }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).toHaveBeenCalled()
      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      expect(newState.toDelete).toContain('player-1')
      expect(newState.toDelete).not.toContain('other-1')
    })

    it('should remove event from toCreate if it exists there', () => {
      const tempEvent: CalendarEvent = {
        id: 'temp-123',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Temp Session',
        player_name: 'TestPlayer',
      }

      const options = {
        ...defaultOptions,
        displayedEvents: [tempEvent],
        pendingChanges: { toCreate: [tempEvent], toDelete: [] },
      }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).toHaveBeenCalled()
      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = {
        toCreate: [tempEvent],
        toDelete: [],
      }
      const newState = setFunction(prevState)

      expect(newState.toCreate).toHaveLength(0)
    })
  })

  describe('handleMouseUp - Drag (Create)', () => {
    it('should create multiple events when dragging vertically', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

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

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      // Should create events at 10, 10.5, and 11
      expect(newState.toCreate.length).toBe(3)
      expect(newState.toCreate[0].startHour).toBe(10)
      expect(newState.toCreate[1].startHour).toBe(10.5)
      expect(newState.toCreate[2].startHour).toBe(11)
    })

    it('should create events when dragging horizontally across days', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(2, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      // Should create events for days 0, 1, 2 at hour 10
      expect(newState.toCreate.length).toBe(3)
      expect(newState.toCreate.map((e: CalendarEvent) => e.day)).toEqual([
        0, 1, 2,
      ])
    })

    it('should create events in a rectangle when dragging diagonally', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(1, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      // Should create events for: (0,10), (0,10.5), (0,11), (1,10), (1,10.5), (1,11)
      expect(newState.toCreate.length).toBe(6)
    })

    it('should handle dragging backwards (end before start)', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(2, 11)
      })

      act(() => {
        result.current.handleMouseEnter(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      // Should still create events from (0,10) to (2,11)
      expect(newState.toCreate.length).toBeGreaterThan(0)
      const days = newState.toCreate.map((e: CalendarEvent) => e.day)
      expect(Math.min(...days)).toBe(0)
      expect(Math.max(...days)).toBe(2)
    })
  })

  describe('handleMouseUp - Drag (Delete)', () => {
    it('should delete multiple events when dragging from existing session', () => {
      const events: CalendarEvent[] = [
        {
          id: 'test-1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Session 1',
          player_name: 'TestPlayer',
        },
        {
          id: 'test-2',
          day: 0,
          startHour: 10.5,
          duration: 3,
          title: 'Session 2',
          player_name: 'TestPlayer',
        },
        {
          id: 'test-3',
          day: 0,
          startHour: 11,
          duration: 3,
          title: 'Session 3',
          player_name: 'TestPlayer',
        },
      ]

      const options = {
        ...defaultOptions,
        displayedEvents: events,
      }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      expect(newState.toDelete).toContain('test-1')
      expect(newState.toDelete).toContain('test-2')
      expect(newState.toDelete).toContain('test-3')
    })

    it('should only delete sessions belonging to current player when dragging', () => {
      const events: CalendarEvent[] = [
        {
          id: 'player-1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Player Session',
          player_name: 'TestPlayer',
        },
        {
          id: 'other-1',
          day: 0,
          startHour: 10.5,
          duration: 3,
          title: 'Other Session',
          player_name: 'OtherPlayer',
        },
        {
          id: 'player-2',
          day: 0,
          startHour: 11,
          duration: 3,
          title: 'Player Session 2',
          player_name: 'TestPlayer',
        },
      ]

      const options = {
        ...defaultOptions,
        displayedEvents: events,
      }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = { toCreate: [], toDelete: [] }
      const newState = setFunction(prevState)

      expect(newState.toDelete).toContain('player-1')
      expect(newState.toDelete).toContain('player-2')
      expect(newState.toDelete).not.toContain('other-1')
    })

    it('should remove deleted events from toCreate list', () => {
      const tempEvent: CalendarEvent = {
        id: 'temp-1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Temp Session',
        player_name: 'TestPlayer',
      }

      const options = {
        ...defaultOptions,
        displayedEvents: [tempEvent],
        pendingChanges: { toCreate: [tempEvent], toDelete: [] },
      }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseEnter(0, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const setFunction = mockSetPendingChanges.mock.calls[0][0]
      const prevState: PendingChanges = {
        toCreate: [tempEvent],
        toDelete: [],
      }
      const newState = setFunction(prevState)

      expect(newState.toCreate).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle mouse up without mouse down', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).not.toHaveBeenCalled()
      expect(mockScheduleSave).not.toHaveBeenCalled()
    })

    it('should handle rapid consecutive clicks', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      act(() => {
        result.current.handleMouseDown(0, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).toHaveBeenCalledTimes(2)
      expect(mockScheduleSave).toHaveBeenCalledTimes(2)
    })

    it('should use translation function for event titles', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockT).toHaveBeenCalledWith('session.title')
    })

    it('should handle changing player name between operations', () => {
      const { result, rerender } = renderHook(
        (props: UseDragAndDropOptions) => useDragAndDrop(props),
        { initialProps: defaultOptions }
      )

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockSetPendingChanges).toHaveBeenCalled()
      const firstCall = mockSetPendingChanges.mock.calls[0][0]
      const firstState = firstCall({ toCreate: [], toDelete: [] })
      expect(firstState.toCreate[0].player_name).toBe('TestPlayer')

      // Change player name
      const newOptions = { ...defaultOptions, playerName: 'NewPlayer' }
      rerender(newOptions)

      mockSetPendingChanges.mockClear()

      act(() => {
        result.current.handleMouseDown(0, 11)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      const secondCall = mockSetPendingChanges.mock.calls[0][0]
      const secondState = secondCall({ toCreate: [], toDelete: [] })
      expect(secondState.toCreate[0].player_name).toBe('NewPlayer')
    })
  })

  describe('scheduleSave Integration', () => {
    it('should call scheduleSave after creating events', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockScheduleSave).toHaveBeenCalledTimes(1)
    })

    it('should call scheduleSave after deleting events', () => {
      const existingEvent: CalendarEvent = {
        id: 'test-1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Test Session',
        player_name: 'TestPlayer',
      }

      const options = {
        ...defaultOptions,
        displayedEvents: [existingEvent],
      }

      const { result } = renderHook(() => useDragAndDrop(options))

      act(() => {
        result.current.handleMouseDown(0, 10)
      })

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockScheduleSave).toHaveBeenCalledTimes(1)
    })

    it('should not call scheduleSave if mouse up without starting drag', () => {
      const { result } = renderHook(() => useDragAndDrop(defaultOptions))

      act(() => {
        result.current.handleMouseUp()
      })

      expect(mockScheduleSave).not.toHaveBeenCalled()
    })
  })
})
