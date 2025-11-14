import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedSave } from './useDebouncedSave'

describe('useDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should initialize with empty pending changes', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    expect(result.current.pendingChanges).toEqual({
      toCreate: [],
      toDelete: [],
    })
    expect(result.current.saveCountdown).toBeNull()
    expect(result.current.isSaving).toBe(false)
    expect(result.current.showSaved).toBe(false)
  })

  it('should start countdown when scheduleSave is called', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
        debounceDelay: 5000,
      })
    )

    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.saveCountdown).toBe(5)
  })

  it('should countdown and trigger save after debounce delay', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
        debounceDelay: 5000,
      })
    )

    // Add some pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test Session',
            player_name: 'Player 1',
          },
        ],
        toDelete: [],
      })
    })

    // Schedule save
    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.saveCountdown).toBe(5)

    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.saveCountdown).toBe(4)

    // Advance time by 4 more seconds (total 5 seconds) and run all pending promises
    await act(async () => {
      vi.advanceTimersByTime(4000)
      await vi.runAllTimersAsync()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      toCreate: expect.arrayContaining([
        expect.objectContaining({
          id: 'test-1',
          player_name: 'Player 1',
        }),
      ]),
      toDelete: [],
    })
  })

  it('should reset countdown when scheduleSave is called multiple times', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
        debounceDelay: 5000,
      })
    )

    // First schedule
    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.saveCountdown).toBe(5)

    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.saveCountdown).toBe(2)

    // Schedule again (should reset)
    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.saveCountdown).toBe(5)
  })

  it('should trigger save immediately with saveNow', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    // Add pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [],
        toDelete: ['session-1', 'session-2'],
      })
    })

    // Save immediately
    await act(async () => {
      await result.current.saveNow()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      toCreate: [],
      toDelete: ['session-1', 'session-2'],
    })
  })

  it('should show saved indicator after successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
        savedIndicatorDuration: 3000,
      })
    )

    // Add pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test',
            player_name: 'Player 1',
          },
        ],
        toDelete: [],
      })
    })

    // Save immediately
    await act(async () => {
      await result.current.saveNow()
    })

    expect(result.current.showSaved).toBe(true)
    expect(result.current.isSaving).toBe(false)

    // Advance time to hide the indicator
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.showSaved).toBe(false)
  })

  it('should clear pending changes after successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    // Add pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test',
            player_name: 'Player 1',
          },
        ],
        toDelete: ['session-1'],
      })
    })

    expect(result.current.pendingChanges.toCreate).toHaveLength(1)
    expect(result.current.pendingChanges.toDelete).toHaveLength(1)

    // Save
    await act(async () => {
      await result.current.saveNow()
    })

    expect(result.current.pendingChanges.toCreate).toHaveLength(0)
    expect(result.current.pendingChanges.toDelete).toHaveLength(0)
  })

  it('should clear pending changes without saving', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    // Add pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test',
            player_name: 'Player 1',
          },
        ],
        toDelete: ['session-1'],
      })
    })

    // Schedule a save
    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.saveCountdown).toBe(5)

    // Clear pending changes
    act(() => {
      result.current.clearPendingChanges()
    })

    expect(result.current.pendingChanges.toCreate).toHaveLength(0)
    expect(result.current.pendingChanges.toDelete).toHaveLength(0)
    expect(result.current.saveCountdown).toBeNull()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('should not trigger save if there are no pending changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    // Try to save without any pending changes
    await act(async () => {
      await result.current.saveNow()
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('should set isSaving to true during save operation', async () => {
    let resolveSave: () => void
    const savePromise = new Promise<void>(resolve => {
      resolveSave = resolve
    })
    const onSave = vi.fn(() => savePromise)

    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    // Add pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test',
            player_name: 'Player 1',
          },
        ],
        toDelete: [],
      })
    })

    // Start saving (don't await yet)
    let savePromiseResult: Promise<void>
    act(() => {
      savePromiseResult = result.current.saveNow()
    })

    // Wait a tick for state to update
    await act(async () => {
      await Promise.resolve()
    })

    // Should be saving
    expect(result.current.isSaving).toBe(true)

    // Resolve the save
    resolveSave!()

    await act(async () => {
      await savePromiseResult!
    })

    // Should no longer be saving
    expect(result.current.isSaving).toBe(false)
  })

  it('should handle save errors gracefully', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const error = new Error('Save failed')
    const onSave = vi.fn().mockRejectedValue(error)

    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    // Add pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test',
            player_name: 'Player 1',
          },
        ],
        toDelete: [],
      })
    })

    // Try to save (should throw)
    let caughtError: Error | null = null
    try {
      await act(async () => {
        await result.current.saveNow()
      })
    } catch (err) {
      caughtError = err as Error
    }

    expect(caughtError?.message).toBe('Save failed')

    // Should no longer be saving
    expect(result.current.isSaving).toBe(false)

    // Console error should have been called
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in useDebouncedSave:',
      error
    )

    consoleErrorSpy.mockRestore()
  })

  it('should clean up timers on unmount', () => {
    const onSave = vi.fn()
    const { result, unmount } = renderHook(() =>
      useDebouncedSave({
        onSave,
      })
    )

    // Add pending changes
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test',
            player_name: 'Player 1',
          },
        ],
        toDelete: [],
      })
    })

    // Schedule a save
    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.saveCountdown).toBe(5)

    // Unmount
    unmount()

    // Advance time - save should not be triggered
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('should hide saved indicator and start countdown when scheduling a new save after previous save completed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useDebouncedSave({
        onSave,
        debounceDelay: 5000,
        savedIndicatorDuration: 3000,
      })
    )

    // First change
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-1',
            day: 0,
            startHour: 10,
            duration: 3,
            title: 'Test',
            player_name: 'Player 1',
          },
        ],
        toDelete: [],
      })
    })

    // Save immediately
    await act(async () => {
      await result.current.saveNow()
    })

    // Should show "saved" indicator
    expect(result.current.showSaved).toBe(true)
    expect(result.current.isSaving).toBe(false)
    expect(result.current.saveCountdown).toBeNull()

    // Make another change while "saved" is still showing
    act(() => {
      result.current.setPendingChanges({
        toCreate: [
          {
            id: 'test-2',
            day: 1,
            startHour: 14,
            duration: 3,
            title: 'Test 2',
            player_name: 'Player 1',
          },
        ],
        toDelete: [],
      })
    })

    // Schedule a new save
    act(() => {
      result.current.scheduleSave()
    })

    // The "saved" indicator should be hidden
    expect(result.current.showSaved).toBe(false)
    // And the countdown should start
    expect(result.current.saveCountdown).toBe(5)
    expect(result.current.isSaving).toBe(false)

    // Advance time by 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Countdown should still be active
    expect(result.current.saveCountdown).toBe(3)
    expect(result.current.showSaved).toBe(false)
  })
})
