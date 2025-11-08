import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useCalendar } from '../../contexts/CalendarContext'
import LanguageSwitcher from '../LanguageSwitcher'
import ThemeToggle from '../ThemeToggle'
import './WeekCalendar.css'

const WeekCalendar = () => {
  const { t } = useTranslation()
  const {
    playerName,
    setPlayerName,
    viewMode,
    setViewMode,
    loading,
    error,
    isDragging,
    dragStart,
    dragEnd,
    saveCountdown,
    isSaving,
    showSaved,
    SESSION_DURATION,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    getFilteredEvents,
  } = useCalendar()

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

  // Get filtered events from context
  const filteredEvents = getFilteredEvents()

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
