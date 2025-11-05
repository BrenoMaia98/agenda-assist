import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import './WeekCalendar.css'

interface CalendarEvent {
  id: string
  day: number
  startHour: number
  duration: number
  title: string
  description?: string
  player_name?: string
}

type ViewMode = 'personal' | 'all'

const WeekCalendar = () => {
  const { t } = useTranslation()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [playerName, setPlayerName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{
    day: number
    hour: number
  } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(
    null
  )
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounced save state
  const [pendingChanges, setPendingChanges] = useState<{
    toCreate: CalendarEvent[]
    toDelete: string[]
  }>({ toCreate: [], toDelete: [] })
  const [saveCountdown, setSaveCountdown] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fixed duration in hours
  const SESSION_DURATION = 3

  // Generate time slots with 30-minute intervals (0, 0.5, 1, 1.5, ... 23.5)
  const timeSlots = Array.from({ length: 48 }, (_, i) => i * 0.5)

  // Generate days of the week
  const daysOfWeek = [
    t('days.sunday'),
    t('days.monday'),
    t('days.tuesday'),
    t('days.wednesday'),
    t('days.thursday'),
    t('days.friday'),
    t('days.saturday'),
  ]

  const formatTime = (hour: number) => {
    const fullHour = Math.floor(hour)
    const minutes = (hour % 1) * 60
    const period = fullHour >= 12 ? 'PM' : 'AM'
    const displayHour =
      fullHour === 0 ? 12 : fullHour > 12 ? fullHour - 12 : fullHour
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Load sessions from Supabase
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase.from('sessions').select('*')

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
  }, [viewMode, playerName, t])

  // Load sessions on mount and when view mode or player changes
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
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
      supabase.removeChannel(channel)
    }
  }, [isSaving, loadSessions])

  // Save pending changes to database
  const savePendingChanges = async () => {
    if (
      pendingChanges.toCreate.length === 0 &&
      pendingChanges.toDelete.length === 0
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
      if (pendingChanges.toDelete.length > 0) {
        for (const id of pendingChanges.toDelete) {
          const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id)
          if (error) {
            console.error('Error deleting session:', error)
          }
        }
      }

      // Create sessions
      if (pendingChanges.toCreate.length > 0) {
        const sessionsToInsert = pendingChanges.toCreate.map(event => ({
          player_name: event.player_name || playerName,
          day: event.day,
          start_hour: event.startHour,
          duration: event.duration,
          title: event.title,
        }))

        const { error } = await supabase
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
  }

  // Schedule a save after 5 seconds
  const scheduleSave = () => {
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
        // Keep countdown at 0 instead of null to avoid disappearing
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
  }

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const handleMouseDown = (day: number, hour: number) => {
    if (playerName.trim().length < 3) {
      alert(t('player.minLengthError'))
      return
    }

    setIsDragging(true)
    setDragStart({ day, hour })
    setDragEnd({ day, hour })
  }

  const handleMouseEnter = (day: number, hour: number) => {
    if (isDragging && dragStart) {
      setDragEnd({ day, hour })
    }
  }

  const handleMouseUp = () => {
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
  }

  // Get filtered events based on view mode
  const filteredEvents =
    viewMode === 'personal'
      ? events.filter(e => e.player_name === playerName)
      : events

  return (
    <div
      className="week-calendar"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="calendar-header">
        <div className="header-top">
          <h1>{t('app.title')}</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <div
          className="view-toggle"
          style={{
            padding: '0.5rem 1rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setViewMode('personal')}
            className={viewMode === 'personal' ? 'active' : ''}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              background:
                viewMode === 'personal'
                  ? 'var(--primary-color)'
                  : 'transparent',
              color: viewMode === 'personal' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              fontWeight: viewMode === 'personal' ? 'bold' : 'normal',
            }}
          >
            {t('view.myAvailability')}
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={viewMode === 'all' ? 'active' : ''}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              background:
                viewMode === 'all' ? 'var(--primary-color)' : 'transparent',
              color: viewMode === 'all' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              fontWeight: viewMode === 'all' ? 'bold' : 'normal',
            }}
          >
            {t('view.allPlayers')}
          </button>
        </div>

        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '1rem',
              color: 'var(--text-secondary)',
            }}
          >
            {t('view.loading')}
          </div>
        )}

        {error && (
          <div
            style={{
              textAlign: 'center',
              padding: '1rem',
              color: 'var(--error-color)',
            }}
          >
            {error}
          </div>
        )}

        <div className="player-info">
          <div className="setting-field player-name-field">
            <label htmlFor="player-name">{t('player.label')}</label>
            <select
              id="player-name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="player-name-input"
              required
            >
              <option value="">{t('player.placeholder')}</option>
              <option value="Breno(GM)">Breno(GM)</option>
              <option value="Nalu">Nalu</option>
              <option value="Yshi">Yshi</option>
              <option value="Drefon">Drefon</option>
              <option value="Frizon">Frizon</option>
              <option value="Tinga">Tinga</option>
              <option value="Zangs">Zangs</option>
            </select>
            {playerName.trim().length === 0 && (
              <span className="required-badge">{t('player.required')}</span>
            )}
          </div>
        </div>

        <div className="session-info">
          <div className="session-title-display">
            <span className="session-label">{t('session.label')}</span>
            <h2 className="session-title">{t('session.title')}</h2>
          </div>
          <div className="session-duration">
            <label>{t('session.duration')}</label>
            <span className="duration-value">
              {SESSION_DURATION} {t('session.hours')}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`calendar-grid-container ${playerName.trim().length < 3 ? 'disabled' : ''}`}
        style={{ position: 'relative' }}
      >
        {playerName.trim().length < 3 && (
          <div className="calendar-overlay">
            <p>{t('calendar.overlayMessage')}</p>
          </div>
        )}

        {/* Save countdown indicator */}
        {(saveCountdown !== null || isSaving || showSaved) && (
          <div
            style={{
              position: 'fixed',
              bottom: '1rem',
              left: '1rem',
              background: showSaved
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, var(--primary-color) 0%, var(--color-primary) 100%)',
              border: '2px solid',
              borderColor: showSaved ? '#059669' : 'var(--primary-color)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 9999,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'white',
              transition: 'all 0.3s ease',
            }}
          >
            {showSaved ? (
              // Checkmark icon for "Saved"
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.5 4L6 11.5L2.5 8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              // Spinning loader
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
            <span>
              {showSaved
                ? t('save.saved')
                : isSaving
                  ? t('save.saving')
                  : saveCountdown === 0
                    ? t('save.saving')
                    : t('save.savingIn', { seconds: saveCountdown })}
            </span>
          </div>
        )}

        <div className="calendar-grid">
          {/* Time column header (empty corner) */}
          <div className="time-header"></div>

          {/* Day headers */}
          {daysOfWeek.map((day, index) => (
            <div key={index} className="day-header">
              <div className="day-name">{day}</div>
            </div>
          ))}

          {/* Time slots */}
          {timeSlots.map(timeSlot => {
            const isFullHour = timeSlot % 1 === 0
            return (
              <Fragment key={`slot-${timeSlot}`}>
                {/* Time label - only show for full hours */}
                <div
                  key={`time-${timeSlot}`}
                  className={`time-label ${!isFullHour ? 'half-hour' : ''}`}
                >
                  {isFullHour ? formatTime(timeSlot) : ''}
                </div>

                {/* Day cells */}
                {daysOfWeek.map((_, dayIndex) => {
                  // Events that start at this exact time slot
                  const startingEvents = filteredEvents.filter(
                    e => e.day === dayIndex && e.startHour === timeSlot
                  )

                  // Check if this cell is covered by any event (but doesn't start here)
                  const coveredByEvents = filteredEvents.filter(
                    e =>
                      e.day === dayIndex &&
                      timeSlot > e.startHour &&
                      timeSlot < e.startHour + e.duration
                  )
                  const isCovered = coveredByEvents.length > 0

                  // Check if this cell is in the drag selection
                  let isInDragSelection = false
                  if (isDragging && dragStart && dragEnd) {
                    const minDay = Math.min(dragStart.day, dragEnd.day)
                    const maxDay = Math.max(dragStart.day, dragEnd.day)
                    const minHour = Math.min(dragStart.hour, dragEnd.hour)
                    const maxHour = Math.max(dragStart.hour, dragEnd.hour)

                    isInDragSelection =
                      dayIndex >= minDay &&
                      dayIndex <= maxDay &&
                      timeSlot >= minHour &&
                      timeSlot <= maxHour
                  }

                  return (
                    <div
                      key={`cell-${dayIndex}-${timeSlot}`}
                      className={`calendar-cell ${!isFullHour ? 'half-hour' : ''} ${isCovered ? 'covered' : ''} ${isInDragSelection ? 'drag-preview' : ''}`}
                      onMouseDown={() => handleMouseDown(dayIndex, timeSlot)}
                      onMouseEnter={() => handleMouseEnter(dayIndex, timeSlot)}
                      onMouseUp={handleMouseUp}
                    >
                      {/* Translucent overlay for covered cells */}
                      {isCovered && <div className="cell-overlay" />}

                      {/* Drag preview overlay */}
                      {isInDragSelection && <div className="drag-overlay" />}

                      {/* Only render events that start at this time slot */}
                      {startingEvents.map(event => (
                        <div
                          key={event.id}
                          className="calendar-event starting-event"
                        >
                          <div className="event-title">{event.title}</div>
                          <div className="event-time">
                            {formatTime(event.startHour)} -{' '}
                            {formatTime(event.startHour + event.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WeekCalendar
