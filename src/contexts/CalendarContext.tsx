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
import { supabase } from '../lib/supabase'
import { useSessionManager } from '../hooks'
import type {
  CalendarEvent,
  ViewMode,
  PendingChanges,
  CalendarContextType,
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
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{
    day: number
    hour: number
  } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(
    null
  )
  
  // Debounced save state
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({
    toCreate: [],
    toDelete: [],
  })
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef<PendingChanges>(pendingChanges)
  
  // Keep ref in sync with state
  useEffect(() => {
    pendingChangesRef.current = pendingChanges
  }, [pendingChanges])
  
  // Constants
  const SESSION_DURATION = 3
  
  // Save pending changes to database
  const savePendingChanges = useCallback(async () => {
    // Use ref to get the latest value
    const currentPendingChanges = pendingChangesRef.current
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
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current)
    
    try {
      // Delete sessions using session manager
      if (currentPendingChanges.toDelete.length > 0) {
        await sessionManagerRef.current.deleteSessions(currentPendingChanges.toDelete)
      }
      
      // Create sessions using session manager
      if (currentPendingChanges.toCreate.length > 0) {
        const sessionsToCreate = currentPendingChanges.toCreate.map(event => ({
          player_name: event.player_name || playerName,
          day: event.day,
          startHour: event.startHour,
          duration: event.duration,
          title: event.title,
        }))
        
        await sessionManagerRef.current.createSessions(sessionsToCreate)
      }
      
      // Clear pending changes
      setPendingChanges({ toCreate: [], toDelete: [] })
      
      // Reload data from database
      const filters = viewMode === 'personal' && playerName 
        ? { playerName } 
        : undefined
      await sessionManagerRef.current.loadSessions(filters)
      
      // Show "Saved" message
      setShowSaved(true)
      
      // Hide "Saved" message after 3 seconds
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setShowSaved(false)
      }, 3000)
    } catch (err) {
      console.error('Error saving changes:', err)
    } finally {
      setIsSaving(false)
    }
  }, [playerName, viewMode])
  
  // Schedule a save after 5 seconds
  const scheduleSave = useCallback(() => {
    // Clear existing timers
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current)
    
    // Start countdown at 5
    setSaveCountdown(5)
    
    // Update countdown every second
    let countdown = 5
    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1
      if (countdown <= 0) {
        setSaveCountdown(0)
        if (countdownIntervalRef.current)
          clearInterval(countdownIntervalRef.current)
      } else {
        setSaveCountdown(countdown)
      }
    }, 1000)
    
    // Schedule the actual save
    saveTimerRef.current = setTimeout(() => {
      savePendingChanges()
    }, 5000)
  }, [savePendingChanges])
  
  // Load sessions on mount and when view mode or player changes
  useEffect(() => {
    const filters = viewMode === 'personal' && playerName 
      ? { playerName } 
      : undefined
    
    sessionManagerRef.current.loadSessions(filters)
  }, [viewMode, playerName])
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])
  
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
  
  // Mouse interaction handlers
  const handleMouseDown = useCallback(
    (day: number, hour: number) => {
      if (playerName.trim().length < 3) {
        alert(t('player.minLengthError'))
        return
      }
      
      setIsDragging(true)
      setDragStart({ day, hour })
      setDragEnd({ day, hour })
    },
    [playerName, t]
  )
  
  const handleMouseEnter = useCallback(
    (day: number, hour: number) => {
      if (isDragging && dragStart) {
        setDragEnd({ day, hour })
      }
    },
    [isDragging, dragStart]
  )
  
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && dragEnd) {
      const events = displayedEvents
      
      // Check if there's a session FOR THE CURRENT PLAYER at the starting position
      const startingEvent = events.find(
        e => e.day === dragStart.day && 
             e.startHour === dragStart.hour && 
             e.player_name === playerName
      )
      
      // Check if clicking on the same cell (not dragging)
      if (dragStart.day === dragEnd.day && dragStart.hour === dragEnd.hour) {
        if (startingEvent) {
          // Delete the existing session FOR THE CURRENT PLAYER - OPTIMISTIC UPDATE
          setPendingChanges(prev => ({
            ...prev,
            toDelete: [...prev.toDelete, startingEvent.id],
            toCreate: prev.toCreate.filter(e => e.id !== startingEvent.id),
          }))
        } else {
          // Create a new session FOR THE CURRENT PLAYER - OPTIMISTIC UPDATE
          const newEvent: CalendarEvent = {
            id: `temp-${Date.now()}-${dragStart.day}-${dragStart.hour}`,
            day: dragStart.day,
            startHour: dragStart.hour,
            duration: SESSION_DURATION,
            title: t('session.title'),
            player_name: playerName,
          }
          setPendingChanges(prev => ({
            ...prev,
            toCreate: [...prev.toCreate, newEvent],
          }))
        }
      } else {
        // Dragging
        const startDay = Math.min(dragStart.day, dragEnd.day)
        const endDay = Math.max(dragStart.day, dragEnd.day)
        const startHour = Math.min(dragStart.hour, dragEnd.hour)
        const endHour = Math.max(dragStart.hour, dragEnd.hour)
        
        if (startingEvent) {
          // Started on existing session: DELETE mode - OPTIMISTIC UPDATE
          // Only delete sessions that belong to the current player
          const eventsToDelete = events.filter(e => {
            const inDayRange = e.day >= startDay && e.day <= endDay
            const inHourRange =
              e.startHour >= startHour && e.startHour <= endHour
            const isCurrentPlayer = e.player_name === playerName
            return inDayRange && inHourRange && isCurrentPlayer
          })
          
          setPendingChanges(prev => ({
            ...prev,
            toDelete: [...prev.toDelete, ...eventsToDelete.map(e => e.id)],
            toCreate: prev.toCreate.filter(
              e => !eventsToDelete.find(del => del.id === e.id)
            ),
          }))
        } else {
          // Started on empty cell: CREATE mode - OPTIMISTIC UPDATE
          const newEvents: CalendarEvent[] = []
          
          // Create sessions for each day in the range
          for (let d = startDay; d <= endDay; d++) {
            // Create sessions for each hour in the range
            for (let h = startHour; h <= endHour; h += 0.5) {
              newEvents.push({
                id: `temp-${Date.now()}-${d}-${h}`,
                day: d,
                startHour: h,
                duration: SESSION_DURATION,
                title: t('session.title'),
                player_name: playerName,
              })
            }
          }
          
          setPendingChanges(prev => ({
            ...prev,
            toCreate: [...prev.toCreate, ...newEvents],
          }))
        }
      }
      
      // Schedule the save
      scheduleSave()
    }
    
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [
    isDragging,
    dragStart,
    dragEnd,
    displayedEvents,
    playerName,
    SESSION_DURATION,
    t,
    scheduleSave,
  ])
  
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

