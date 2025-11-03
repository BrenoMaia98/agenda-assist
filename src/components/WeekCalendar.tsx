import { useState } from 'react'
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
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [playerName, setPlayerName] = useState('')

  // Fixed duration in hours
  const SESSION_DURATION = 3

  // Generate time slots with 30-minute intervals (0, 0.5, 1, 1.5, ... 23.5)
  const timeSlots = Array.from({ length: 48 }, (_, i) => i * 0.5)

  // Get the start of the current week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const weekStart = getWeekStart(currentWeek)

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
  const weekDates = daysOfWeek.map((_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })

  const formatTime = (hour: number) => {
    const fullHour = Math.floor(hour)
    const minutes = (hour % 1) * 60
    const period = fullHour >= 12 ? 'PM' : 'AM'
    const displayHour = fullHour === 0 ? 12 : fullHour > 12 ? fullHour - 12 : fullHour
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek)
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newDate)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  const handleCellClick = (day: number, hour: number) => {
    if (playerName.trim().length < 3) {
      alert(t('player.minLengthError'))
      return
    }

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      day,
      startHour: hour,
      duration: SESSION_DURATION,
      title: t('session.title'),
    }
    setEvents([...events, newEvent])
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="week-calendar">
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
            {playerName.trim().length < 3 && (
              <span className="required-badge">
                {playerName.trim().length === 0
                  ? t('player.required')
                  : `${3 - playerName.trim().length} ${t('player.more')}`}
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

        <div className="week-navigation">
          <button onClick={() => navigateWeek('prev')}>
            {t('navigation.previousWeek')}
          </button>
          <button onClick={goToToday}>{t('navigation.today')}</button>
          <button onClick={() => navigateWeek('next')}>
            {t('navigation.nextWeek')}
          </button>
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
          {weekDates.map((date, index) => (
            <div
              key={index}
              className={`day-header ${isToday(date) ? 'today' : ''}`}
            >
              <div className="day-name">{daysOfWeek[index]}</div>
              <div className="day-date">{formatDate(date)}</div>
            </div>
          ))}

          {/* Time slots */}
          {timeSlots.map(timeSlot => {
            const isFullHour = timeSlot % 1 === 0
            return (
              <>
                {/* Time label - only show for full hours */}
                <div
                  key={`time-${timeSlot}`}
                  className={`time-label ${!isFullHour ? 'half-hour' : ''}`}
                >
                  {isFullHour ? formatTime(timeSlot) : ''}
                </div>

                {/* Day cells */}
                {weekDates.map((_, dayIndex) => {
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

                  return (
                    <div
                      key={`cell-${dayIndex}-${timeSlot}`}
                      className={`calendar-cell ${!isFullHour ? 'half-hour' : ''} ${isToday(weekDates[dayIndex]) ? 'today-column' : ''} ${isCovered ? 'covered' : ''}`}
                      onClick={() => handleCellClick(dayIndex, timeSlot)}
                    >
                      {/* Translucent overlay for covered cells */}
                      {isCovered && <div className="cell-overlay" />}

                      {/* Only render events that start at this time slot */}
                      {startingEvents.map(event => (
                        <div
                          key={event.id}
                          className="calendar-event starting-event"
                          onClick={e => {
                            e.stopPropagation()
                            if (window.confirm(t('calendar.deleteConfirm'))) {
                              setEvents(events.filter(e => e.id !== event.id))
                            }
                          }}
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
              </>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WeekCalendar
