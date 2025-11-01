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

interface SelectedSlot {
  day: number
  dayName: string
  date: string
  startHour: number
  endHour: number
}

const WeekCalendar = () => {
  const { t } = useTranslation()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [playerName, setPlayerName] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)

  // Fixed duration in hours
  const SESSION_DURATION = 3

  // Generate hours from 0 to 23
  const hours = Array.from({ length: 24 }, (_, i) => i)

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
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period}`
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

    const endHour = hour + SESSION_DURATION
    setSelectedSlot({
      day,
      dayName: daysOfWeek[day],
      date: formatDate(weekDates[day]),
      startHour: hour,
      endHour: endHour > 23 ? 24 : endHour,
    })
  }

  const handleCreateSession = () => {
    if (!selectedSlot) {
      alert(t('calendar.selectTimeSlot'))
      return
    }

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      day: selectedSlot.day,
      startHour: selectedSlot.startHour,
      duration: SESSION_DURATION,
      title: t('session.title'),
    }
    setEvents([...events, newEvent])
    setSelectedSlot(null)
  }

  const handleClearSelection = () => {
    setSelectedSlot(null)
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

        {selectedSlot && (
          <div className="selected-hours">
            <h3>{t('selectedHours.title')}</h3>
            <div className="selected-info">
              <p>
                <strong>
                  {selectedSlot.dayName}, {selectedSlot.date}
                </strong>
              </p>
              <p>
                {formatTime(selectedSlot.startHour)} -{' '}
                {formatTime(selectedSlot.endHour)}
              </p>
            </div>
            <div className="selected-actions">
              <button onClick={handleCreateSession} className="btn-create">
                {t('selectedHours.createButton')}
              </button>
              <button onClick={handleClearSelection} className="btn-clear">
                {t('selectedHours.clearButton')}
              </button>
            </div>
          </div>
        )}

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
          {hours.map(hour => (
            <>
              {/* Time label */}
              <div key={`time-${hour}`} className="time-label">
                {formatTime(hour)}
              </div>

              {/* Day cells */}
              {weekDates.map((_, dayIndex) => {
                const dayEvents = events.filter(
                  e => e.day === dayIndex && e.startHour === hour
                )

                return (
                  <div
                    key={`cell-${dayIndex}-${hour}`}
                    className={`calendar-cell ${isToday(weekDates[dayIndex]) ? 'today-column' : ''}`}
                    onClick={() => handleCellClick(dayIndex, hour)}
                  >
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="calendar-event"
                        style={{
                          height: `${event.duration * 100}%`,
                        }}
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
          ))}
        </div>
      </div>
    </div>
  )
}

export default WeekCalendar
