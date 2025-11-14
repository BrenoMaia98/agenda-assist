import { useCallback, useRef, useState } from 'react'
import type { CalendarEvent, PendingChanges } from '../contexts/types'

export interface DragPosition {
  day: number
  hour: number
}

export interface UseDragAndDropOptions {
  playerName: string
  displayedEvents: CalendarEvent[]
  pendingChanges: PendingChanges
  setPendingChanges: (
    changes: PendingChanges | ((prev: PendingChanges) => PendingChanges)
  ) => void
  scheduleSave: () => void
  SESSION_DURATION: number
  t: (key: string) => string
}

export interface UseDragAndDropReturn {
  isDragging: boolean
  dragStart: DragPosition | null
  dragEnd: DragPosition | null
  handleMouseDown: (day: number, hour: number) => void
  handleMouseEnter: (day: number, hour: number) => void
  handleMouseUp: () => void
}

export const useDragAndDrop = (
  options: UseDragAndDropOptions
): UseDragAndDropReturn => {
  const {
    playerName,
    displayedEvents,
    pendingChanges,
    setPendingChanges,
    scheduleSave,
    SESSION_DURATION,
    t,
  } = options

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<DragPosition | null>(null)
  const [dragEnd, setDragEnd] = useState<DragPosition | null>(null)

  // Use refs to track drag state synchronously (to avoid race conditions with async state updates)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<DragPosition | null>(null)
  const dragEndRef = useRef<DragPosition | null>(null)

  // Mouse interaction handlers
  const handleMouseDown = useCallback(
    (day: number, hour: number) => {
      if (playerName.trim().length < 3) {
        alert(t('player.minLengthError'))
        return
      }

      const position = { day, hour }

      // Update refs immediately for synchronous access
      isDraggingRef.current = true
      dragStartRef.current = position
      dragEndRef.current = position

      // Update state for rendering
      setIsDragging(true)
      setDragStart(position)
      setDragEnd(position)
    },
    [playerName, t]
  )

  const handleMouseEnter = useCallback((day: number, hour: number) => {
    // Use ref for synchronous check to avoid race conditions
    if (isDraggingRef.current && dragStartRef.current) {
      const position = { day, hour }
      dragEndRef.current = position
      setDragEnd(position)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    // Use refs for the final drag state to ensure we have the latest values
    if (isDraggingRef.current && dragStartRef.current && dragEndRef.current) {
      const events = displayedEvents
      const dragStart = dragStartRef.current
      const dragEnd = dragEndRef.current

      // Check if there's a session FOR THE CURRENT PLAYER at the starting position
      const startingEvent = events.find(
        e =>
          e.day === dragStart.day &&
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
          let idCounter = 0

          // Create sessions for each day in the range
          for (let d = startDay; d <= endDay; d++) {
            // Create sessions for each hour in the range
            for (let h = startHour; h <= endHour; h += 0.5) {
              newEvents.push({
                id: `temp-${Date.now()}-${idCounter++}-d${d}-h${h}`,
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

    // Reset refs
    isDraggingRef.current = false
    dragStartRef.current = null
    dragEndRef.current = null

    // Reset state
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [
    displayedEvents,
    playerName,
    SESSION_DURATION,
    t,
    scheduleSave,
    setPendingChanges,
  ])

  return {
    isDragging,
    dragStart,
    dragEnd,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  }
}
