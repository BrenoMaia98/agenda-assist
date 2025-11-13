import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useDebouncedSave, useDragAndDrop, useSessionManager } from '../hooks'
import { supabase } from '../lib/supabase'
import type {
  CalendarContextType,
  CalendarEvent,
  PendingChanges,
  ViewMode,
} from './types'

export type { CalendarEvent, ViewMode }

const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
)

interface CalendarProviderProps {
  children: ReactNode
  // Allow overriding supabase for testing
  supabaseClient?: typeof supabase
}

export const CalendarProvider = ({
  children,
  supabaseClient = supabase,
}: CalendarProviderProps) => {
  const { t } = useTranslation()

  // Use session manager hook
  const sessionManager = useSessionManager({
    autoLoad: false, // We'll manually load based on view mode
    enableRealtime: true,
    supabaseClient,
  })

  // Store stable references to session manager functions
  const sessionManagerRef = useRef(sessionManager)
  sessionManagerRef.current = sessionManager

  // Core state
  const [playerName, setPlayerName] = useState('')
  const [currentUser, setCurrentUserState] = useState('')
  const [showPlayerModal, setShowPlayerModal] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  // Constants
  const SESSION_DURATION = 3

  // Use debounced save hook
  const {
    pendingChanges,
    setPendingChanges,
    saveCountdown,
    isSaving,
    showSaved,
    scheduleSave,
  } = useDebouncedSave({
    debounceDelay: 5000, // 5 seconds
    savedIndicatorDuration: 3000, // 3 seconds
    onSave: useCallback(
      async (currentPendingChanges: PendingChanges) => {
        // Delete sessions using session manager
        if (currentPendingChanges.toDelete.length > 0) {
          await sessionManagerRef.current.deleteSessions(
            currentPendingChanges.toDelete
          )
        }

        // Create sessions using session manager
        if (currentPendingChanges.toCreate.length > 0) {
          const sessionsToCreate = currentPendingChanges.toCreate.map(
            event => ({
              player_name: event.player_name || playerName,
              day: event.day,
              startHour: event.startHour,
              duration: event.duration,
              title: event.title,
            })
          )

          await sessionManagerRef.current.createSessions(sessionsToCreate)
        }

        // Reload data from database
        const filters =
          viewMode === 'personal' && playerName ? { playerName } : undefined
        await sessionManagerRef.current.loadSessions(filters)
      },
      [playerName, viewMode]
    ),
  })

  // Load sessions on mount and when view mode or player changes
  useEffect(() => {
    const filters =
      viewMode === 'personal' && playerName ? { playerName } : undefined

    sessionManagerRef.current.loadSessions(filters)
  }, [viewMode, playerName])

  // Compute displayed events (combine loaded sessions with pending changes for optimistic updates)
  const displayedEvents = useMemo(() => {
    // Start with loaded sessions
    let events = [...sessionManager.sessions]

    // Remove events that are pending deletion
    if (pendingChanges.toDelete.length > 0) {
      events = events.filter(e => !pendingChanges.toDelete.includes(e.id))
    }

    // Add events that are pending creation
    if (pendingChanges.toCreate.length > 0) {
      events = [...events, ...pendingChanges.toCreate]
    }

    return events
  }, [sessionManager.sessions, pendingChanges])

  // Use drag and drop hook
  const {
    isDragging,
    dragStart,
    dragEnd,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  } = useDragAndDrop({
    playerName,
    displayedEvents,
    pendingChanges,
    setPendingChanges,
    scheduleSave,
    SESSION_DURATION,
    t,
  })

  // Set current user
  const setCurrentUser = useCallback((name: string) => {
    setCurrentUserState(name)
    setShowPlayerModal(false)
    // Automatically set the player name to the current user
    setPlayerName(name)
  }, [])

  // Get filtered events based on view mode
  const getFilteredEvents = useCallback(() => {
    return viewMode === 'personal'
      ? displayedEvents.filter(e => e.player_name === playerName)
      : displayedEvents
  }, [displayedEvents, viewMode, playerName])

  const value: CalendarContextType = {
    // Core state
    events: displayedEvents,
    playerName,
    currentUser,
    viewMode,
    loading: sessionManager.loading,
    error: sessionManager.error,
    showPlayerModal,
    supabaseClient,

    // Drag state
    isDragging,
    dragStart,
    dragEnd,

    // Debounced save state
    pendingChanges,
    saveCountdown,
    isSaving,
    showSaved,

    // Actions
    setPlayerName,
    setCurrentUser,
    setViewMode,
    setShowPlayerModal,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    getFilteredEvents,

    // Constants
    SESSION_DURATION,
  }

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  )
}

export const useCalendar = () => {
  const context = useContext(CalendarContext)
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}
