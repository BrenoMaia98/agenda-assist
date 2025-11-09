import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
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
  
  // Core state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [playerName, setPlayerName] = useState('')
  const [currentUser, setCurrentUserState] = useState(() => {
    // Load from localStorage on initialization
    return localStorage.getItem('agendaAssist_currentUser') || ''
  })
  const [showPlayerModal, setShowPlayerModal] = useState(!currentUser)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
  
  // Load sessions from Supabase
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabaseClient.from('sessions').select('*')
      
      // Filter by player name if in personal view
      if (viewMode === 'personal' && playerName) {
        query = query.eq('player_name', playerName)
      }
      
      const { data, error: fetchError } = await query
      
      if (fetchError) throw fetchError
      
      // Convert database sessions to calendar events
      const calendarEvents: CalendarEvent[] = (data || []).map(session => ({
        id: session.id,
        day: session.day,
        startHour: session.start_hour,
        duration: session.duration,
        title: session.title,
        player_name: session.player_name,
      }))
      
      setEvents(calendarEvents)
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError(t('view.error'))
    } finally {
      setLoading(false)
    }
  }, [viewMode, playerName, t, supabaseClient])
  
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
      // Delete sessions
      if (currentPendingChanges.toDelete.length > 0) {
        for (const id of currentPendingChanges.toDelete) {
          const { error } = await supabaseClient
            .from('sessions')
            .delete()
            .eq('id', id)
          if (error) {
            console.error('Error deleting session:', error)
          }
        }
      }
      
      // Create sessions
      if (currentPendingChanges.toCreate.length > 0) {
        const sessionsToInsert = currentPendingChanges.toCreate.map(event => ({
          player_name: event.player_name || playerName,
          day: event.day,
          start_hour: event.startHour,
          duration: event.duration,
          title: event.title,
        }))
        
        const { error } = await supabaseClient
          .from('sessions')
          .insert(sessionsToInsert)
        if (error) {
          console.error('Error creating sessions:', error)
          throw error
        }
      }
      
      // Clear pending changes
      setPendingChanges({ toCreate: [], toDelete: [] })
      
      // Reload data from database
      await loadSessions()
      
      // Show "Saved" message
      setShowSaved(true)
      
      // Hide "Saved" message after 3 seconds
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => {
        setShowSaved(false)
      }, 3000)
    } catch (err) {
      console.error('Error saving changes:', err)
      setError('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }, [playerName, loadSessions, supabaseClient])
  
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
    loadSessions()
  }, [loadSessions])
  
  // Set up real-time subscription
  useEffect(() => {
    const channel = supabaseClient
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          // Reload sessions when any change occurs (but not if we're in the middle of saving)
          if (!isSaving) {
            loadSessions()
          }
        }
      )
      .subscribe()
    
    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [isSaving, loadSessions, supabaseClient])
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])
  
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
      // Check if there's a session at the starting position
      const startingEvent = events.find(
        e => e.day === dragStart.day && e.startHour === dragStart.hour
      )
      
      // Check if clicking on the same cell (not dragging)
      if (dragStart.day === dragEnd.day && dragStart.hour === dragEnd.hour) {
        if (startingEvent) {
          // Delete the existing session - OPTIMISTIC UPDATE
          setEvents(events.filter(e => e.id !== startingEvent.id))
          setPendingChanges(prev => ({
            ...prev,
            toDelete: [...prev.toDelete, startingEvent.id],
            toCreate: prev.toCreate.filter(e => e.id !== startingEvent.id),
          }))
        } else {
          // Create a new session - OPTIMISTIC UPDATE
          const newEvent: CalendarEvent = {
            id: `temp-${Date.now()}-${dragStart.day}-${dragStart.hour}`,
            day: dragStart.day,
            startHour: dragStart.hour,
            duration: SESSION_DURATION,
            title: t('session.title'),
            player_name: playerName,
          }
          setEvents([...events, newEvent])
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
          const eventsToDelete = events.filter(e => {
            const inDayRange = e.day >= startDay && e.day <= endDay
            const inHourRange =
              e.startHour >= startHour && e.startHour <= endHour
            return inDayRange && inHourRange
          })
          
          setEvents(events.filter(e => !eventsToDelete.includes(e)))
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
          
          setEvents([...events, ...newEvents])
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
    events,
    playerName,
    SESSION_DURATION,
    t,
    scheduleSave,
  ])
  
  // Set current user and save to localStorage
  const setCurrentUser = useCallback((name: string) => {
    setCurrentUserState(name)
    localStorage.setItem('agendaAssist_currentUser', name)
    setShowPlayerModal(false)
    // Automatically set the player name to the current user
    setPlayerName(name)
  }, [])
  
  // Get filtered events based on view mode
  const getFilteredEvents = useCallback(() => {
    return viewMode === 'personal'
      ? events.filter(e => e.player_name === playerName)
      : events
  }, [events, viewMode, playerName])
  
  const value: CalendarContextType = {
    // Core state
    events,
    playerName,
    currentUser,
    viewMode,
    loading,
    error,
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
    loadSessions,
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

