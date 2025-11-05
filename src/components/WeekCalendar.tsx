import { useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import './WeekCalendar.css'
import LanguageSwitcher from './LanguageSwitcher'

interface CalendarEvent {
  id: string
  day: number
  startHour: number
  duration: number
  title: string
  description?: string
}

const WeekCalendar = () => {
  const { t } = useTranslation()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [playerName, setPlayerName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null)

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
    const displayHour = fullHour === 0 ? 12 : fullHour > 12 ? fullHour - 12 : fullHour
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
  }


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
          // Delete the existing session
          setEvents(events.filter(e => e.id !== startingEvent.id))
        } else {
          // Create a new session
          const newEvent: CalendarEvent = {
            id: `${Date.now()}-${dragStart.day}-${dragStart.hour}`,
            day: dragStart.day,
            startHour: dragStart.hour,
            duration: SESSION_DURATION,
            title: t('session.title'),
          }
          setEvents([...events, newEvent])
        }
      } else {
        // Dragging
        const startDay = Math.min(dragStart.day, dragEnd.day)
        const endDay = Math.max(dragStart.day, dragEnd.day)
        const startHour = Math.min(dragStart.hour, dragEnd.hour)
        const endHour = Math.max(dragStart.hour, dragEnd.hour)
        
        if (startingEvent) {
          // Started on existing session: DELETE mode
          // Remove all sessions in the dragged area
          setEvents(events.filter(e => {
            const inDayRange = e.day >= startDay && e.day <= endDay
            const inHourRange = e.startHour >= startHour && e.startHour <= endHour
            // Keep events that are NOT in the selection
            return !(inDayRange && inHourRange)
          }))
        } else {
          // Started on empty cell: CREATE mode
          const newEvents: CalendarEvent[] = []
          
          // Create sessions for each day in the range
          for (let d = startDay; d <= endDay; d++) {
            // Create sessions for each hour in the range
            for (let h = startHour; h <= endHour; h += 0.5) {
              newEvents.push({
                id: `${Date.now()}-${d}-${h}`,
                day: d,
                startHour: h,
                duration: SESSION_DURATION,
                title: t('session.title'),
              })
            }
          }
          
          setEvents([...events, ...newEvents])
        }
      }
    }

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId))
  }


  return (
    <div className="week-calendar" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="calendar-header">
        <div className="header-top">
          <h1>{t('app.title')}</h1>
          <LanguageSwitcher />
        </div>

        <div className="player-info">
          <div className="setting-field player-name-field">
            <label htmlFor="player-name">{t('player.label')}</label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder={t('player.placeholder')}
              className="player-name-input"
              minLength={3}
            />
            {playerName.trim().length === 0 && (
              <span className="required-badge">
                {t('player.required')}
              </span>
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
      >
        {playerName.trim().length < 3 && (
          <div className="calendar-overlay">
            <p>{t('calendar.overlayMessage')}</p>
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
                  const startingEvents = events.filter(
                    e => e.day === dayIndex && e.startHour === timeSlot
                  )

                  // Check if this cell is covered by any event (but doesn't start here)
                  const coveredByEvents = events.filter(
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
