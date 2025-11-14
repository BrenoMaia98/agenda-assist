import { useState, useCallback, useRef, useEffect } from 'react'
import type { PendingChanges } from '../contexts/types'

export interface UseDebouncedSaveOptions {
  /**
   * The delay in milliseconds before the save is triggered
   * @default 5000 (5 seconds)
   */
  debounceDelay?: number

  /**
   * How long to show the "saved" indicator after a successful save
   * @default 3000 (3 seconds)
   */
  savedIndicatorDuration?: number

  /**
   * Callback function to perform the actual save operation
   */
  onSave: (pendingChanges: PendingChanges) => Promise<void>
}

export interface UseDebouncedSaveReturn {
  /**
   * The current pending changes (events to create and delete)
   */
  pendingChanges: PendingChanges

  /**
   * Set the pending changes
   */
  setPendingChanges: React.Dispatch<React.SetStateAction<PendingChanges>>

  /**
   * The countdown timer (in seconds) before the save is triggered
   */
  saveCountdown: number | null

  /**
   * Whether a save operation is currently in progress
   */
  isSaving: boolean

  /**
   * Whether to show the "saved" indicator
   */
  showSaved: boolean

  /**
   * Schedule a save operation (resets the countdown)
   */
  scheduleSave: () => void

  /**
   * Manually trigger a save operation immediately
   */
  saveNow: () => Promise<void>

  /**
   * Clear all pending changes without saving
   */
  clearPendingChanges: () => void
}

/**
 * Hook to manage debounced save operations with a countdown timer
 *
 * This hook provides a mechanism to batch multiple changes and save them
 * after a configurable delay, with visual feedback through countdown and
 * save status indicators.
 *
 * @example
 * ```tsx
 * const { pendingChanges, setPendingChanges, scheduleSave, isSaving, saveCountdown } =
 *   useDebouncedSave({
 *     onSave: async (changes) => {
 *       await api.saveChanges(changes)
 *     }
 *   })
 *
 * // Add a change
 * setPendingChanges(prev => ({
 *   ...prev,
 *   toCreate: [...prev.toCreate, newEvent]
 * }))
 * scheduleSave()
 * ```
 */
export const useDebouncedSave = ({
  debounceDelay = 5000,
  savedIndicatorDuration = 3000,
  onSave,
}: UseDebouncedSaveOptions): UseDebouncedSaveReturn => {
  // State
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({
    toCreate: [],
    toDelete: [],
  })
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  // Refs for timers
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef<PendingChanges>(pendingChanges)

  // Keep ref in sync with state
  useEffect(() => {
    pendingChangesRef.current = pendingChanges
  }, [pendingChanges])

  /**
   * Clear all active timers
   */
  const clearTimers = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
  }, [])

  /**
   * Perform the save operation
   */
  const performSave = useCallback(async () => {
    // Use ref to get the latest value
    const currentPendingChanges = pendingChangesRef.current

    // Nothing to save
    if (
      currentPendingChanges.toCreate.length === 0 &&
      currentPendingChanges.toDelete.length === 0
    ) {
      return
    }

    // Clear countdown and set saving state
    setSaveCountdown(null)
    setIsSaving(true)

    // Clear timers
    clearTimers()

    try {
      // Call the provided save function
      await onSave(currentPendingChanges)

      // Clear pending changes
      setPendingChanges({ toCreate: [], toDelete: [] })

      // Show "Saved" indicator
      setShowSaved(true)

      // Hide "Saved" indicator after configured duration
      savedTimerRef.current = setTimeout(() => {
        setShowSaved(false)
      }, savedIndicatorDuration)
    } catch (err) {
      console.error('Error in useDebouncedSave:', err)
      throw err // Re-throw so caller can handle it
    } finally {
      setIsSaving(false)
    }
  }, [onSave, savedIndicatorDuration, clearTimers])

  /**
   * Schedule a save after the configured delay
   */
  const scheduleSave = useCallback(() => {
    // Clear existing timers and hide "saved" indicator
    clearTimers()
    setShowSaved(false)

    // Start countdown
    const countdownSeconds = Math.ceil(debounceDelay / 1000)
    setSaveCountdown(countdownSeconds)

    // Update countdown every second
    let countdown = countdownSeconds
    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1
      if (countdown <= 0) {
        setSaveCountdown(0)
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
      } else {
        setSaveCountdown(countdown)
      }
    }, 1000)

    // Schedule the actual save
    saveTimerRef.current = setTimeout(() => {
      performSave()
    }, debounceDelay)
  }, [debounceDelay, clearTimers, performSave])

  /**
   * Manually trigger a save immediately
   */
  const saveNow = useCallback(async () => {
    clearTimers()
    await performSave()
  }, [clearTimers, performSave])

  /**
   * Clear pending changes without saving
   */
  const clearPendingChanges = useCallback(() => {
    clearTimers()
    setPendingChanges({ toCreate: [], toDelete: [] })
    setSaveCountdown(null)
  }, [clearTimers])

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  return {
    pendingChanges,
    setPendingChanges,
    saveCountdown,
    isSaving,
    showSaved,
    scheduleSave,
    saveNow,
    clearPendingChanges,
  }
}
