import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useCalendar } from '../../contexts/CalendarContext'
import { usePlayerManager } from '../../hooks'
import LanguageSwitcher from '../LanguageSwitcher'
import ThemeToggle from '../ThemeToggle'
import {
  formatTime,
  getPlayersAtTimeSlot,
  getPlayersStartingAt,
  getSessionsStartingAt,
} from './utils'
import './WeekCalendar.css'

const WeekCalendar = () => {
  const { t } = useTranslation()
  const {
    playerName,
    setPlayerName,
    currentUser,
    viewMode,
    setViewMode,
    setShowPlayerModal,
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
    events,
    supabaseClient,
  } = useCalendar()

  // Use player manager hook
  const { players } = usePlayerManager({
    autoLoad: true,
    enableRealtime: true,
    supabaseClient: supabaseClient,
  })

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
          <div className="session-player">
            <label htmlFor="player-name">{t('player.label')}</label>
            <div
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <select
                id="player-name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="player-name-select"
                required
              >
                <option value="">{t('player.placeholder')}</option>
                {players.map(player => (
                  <option key={player.id} value={player.name}>
                    {player.name}
                    {player.is_gm ? ' (GM)' : ''}
                  </option>
                ))}
              </select>
              {currentUser && (
                <button
                  onClick={() => setShowPlayerModal(true)}
                  className="change-user-button"
                  title={t('player.changeUser')}
                >
                  {t('player.changeUser')}
                </button>
              )}
            </div>
            {playerName.trim().length === 0 && (
              <span className="required-badge">{t('player.required')}</span>
            )}
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
              border:
                viewMode === 'personal'
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--border-color)',
              borderRadius: '4px',
              background:
                viewMode === 'personal'
                  ? 'var(--primary-color)'
                  : 'transparent',
              color: viewMode === 'personal' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              fontWeight: viewMode === 'personal' ? 'bold' : 'normal',
              boxShadow:
                viewMode === 'personal'
                  ? '0 0 0 2px rgba(139, 92, 246, 0.2)'
                  : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {t('view.myAvailability')}
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={viewMode === 'all' ? 'active' : ''}
            style={{
              padding: '0.5rem 1rem',
              border:
                viewMode === 'all'
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--border-color)',
              borderRadius: '4px',
              background:
                viewMode === 'all' ? 'var(--primary-color)' : 'transparent',
              color: viewMode === 'all' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              fontWeight: viewMode === 'all' ? 'bold' : 'normal',
              boxShadow:
                viewMode === 'all'
                  ? '0 0 0 2px rgba(139, 92, 246, 0.2)'
                  : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {t('view.allPlayers')}
          </button>
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
                : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
              border: '2px solid',
              borderColor: showSaved ? '#059669' : 'var(--color-primary-hover)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 9999,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#ffffff',
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
                  stroke="#ffffff"
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
                  border: '2px solid #ffffff',
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
                  // Get all players available at this time slot (for highlighting)
                  const playersAtSlot = getPlayersAtTimeSlot(
                    dayIndex,
                    timeSlot,
                    events
                  )
                  const hasPlayers = playersAtSlot.length > 0

                  // Cell should be green if all players are available (even if overlapping)
                  const allPlayersAvailable =
                    playersAtSlot.length === players.length

                  // Get players whose sessions START at this time slot (for display)
                  const playersStarting = getPlayersStartingAt(
                    dayIndex,
                    timeSlot,
                    events
                  )
                  const sessionsStarting = getSessionsStartingAt(
                    dayIndex,
                    timeSlot,
                    events
                  )
                  const hasStartingSessions = playersStarting.length > 0

                  // Only show badge message if ALL players are STARTING at this cell
                  const showAllPlayersMessage =
                    playersStarting.length === players.length

                  // Check if we should show this cell (based on view mode and filters)
                  const shouldShowCell =
                    viewMode === 'all' ||
                    (viewMode === 'personal' &&
                      playersAtSlot.includes(playerName))

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

                  // Check if this cell should be dimmed
                  // Dim if: 1) in all-players view and doesn't include selected player
                  //         2) has players but is not a starting point (continuation cell)
                  // BUT: Never dim green cells (where all players are available)
                  const shouldDim =
                    !allPlayersAvailable &&
                    ((viewMode === 'all' &&
                      playerName.trim().length >= 3 &&
                      hasPlayers &&
                      !playersAtSlot.includes(playerName)) ||
                      (hasPlayers && !hasStartingSessions))

                  return (
                    <div
                      key={`cell-${dayIndex}-${timeSlot}`}
                      className={`calendar-cell ${!isFullHour ? 'half-hour' : ''} ${hasPlayers && shouldShowCell ? 'has-availability' : ''} ${allPlayersAvailable && shouldShowCell ? 'all-players-available' : ''} ${isInDragSelection ? 'drag-preview' : ''} ${shouldDim ? 'dimmed' : ''}`}
                      onMouseDown={() => handleMouseDown(dayIndex, timeSlot)}
                      onMouseEnter={() => handleMouseEnter(dayIndex, timeSlot)}
                    >
                      {/* Drag preview overlay */}
                      {isInDragSelection && <div className="drag-overlay" />}

                      {/* Show player names ONLY at session starting points */}
                      {hasStartingSessions && shouldShowCell && (
                        <div
                          className={`availability-indicator ${showAllPlayersMessage ? 'all-available' : ''}`}
                        >
                          {showAllPlayersMessage ? (
                            // When all players agreed, show time range and badge
                            <>
                              <div
                                className="session-time-display"
                                style={{ marginBottom: '0.25rem' }}
                              >
                                {formatTime(sessionsStarting[0].startHour)}-
                                {formatTime(sessionsStarting[0].endHour)}
                              </div>
                              <div className="all-available-badge">
                                ✓ {t('calendar.allPlayersAvailable')}
                              </div>
                            </>
                          ) : (
                            // Otherwise, show time range once and player names joined by commas
                            <div className="players-list">
                              <div
                                className="session-time-display"
                                style={{ marginBottom: '0.25rem' }}
                              >
                                {formatTime(sessionsStarting[0].startHour)}-
                                {formatTime(sessionsStarting[0].endHour)}
                              </div>
                              <div className="player-name-display">
                                {sessionsStarting
                                  .map(s => s.playerName)
                                  .join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
