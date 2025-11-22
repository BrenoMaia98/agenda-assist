import type { CalendarEvent } from '../../contexts/types'

export interface SessionInfo {
  playerName: string
  startHour: number
  endHour: number
}

/**
 * Formats a decimal hour value into 12-hour time format with AM/PM
 * @param hour - Decimal hour (e.g., 13.5 for 1:30 PM, 24.5 for 12:30 AM next day)
 * @returns Formatted time string (e.g., "1:30 PM")
 */
export const formatTime = (hour: number): string => {
  // Normalize hour to 0-23 range (handle times past midnight)
  const normalizedHour = hour % 24
  const fullHour = Math.floor(normalizedHour)
  const minutes = Math.round((normalizedHour % 1) * 60)
  const period = fullHour >= 12 ? 'PM' : 'AM'
  const displayHour =
    fullHour === 0 ? 12 : fullHour > 12 ? fullHour - 12 : fullHour
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Gets all players who have availability at a specific time slot
 * This includes players whose sessions cover this time (not just starting at this time)
 * @param day - Day of the week (0-6)
 * @param hour - Hour of the day (decimal, e.g., 10.5 for 10:30)
 * @param events - Array of calendar events
 * @returns Array of player names available at this time slot
 */
export const getPlayersAtTimeSlot = (
  day: number,
  hour: number,
  events: CalendarEvent[]
): string[] => {
  const playersAvailable = new Set<string>()

  // Check all events to see which players are available
  events.forEach(event => {
    // Check if this event covers this time slot
    if (
      event.day === day &&
      hour >= event.startHour &&
      hour < event.startHour + event.duration
    ) {
      if (event.player_name) {
        playersAvailable.add(event.player_name)
      }
    }
  })

  return Array.from(playersAvailable)
}

/**
 * Gets players whose sessions START at a specific time slot
 * (not sessions that just cover this time)
 * @param day - Day of the week (0-6)
 * @param hour - Hour of the day (decimal, e.g., 10.5 for 10:30)
 * @param events - Array of calendar events
 * @returns Array of player names with sessions starting at this time
 */
export const getPlayersStartingAt = (
  day: number,
  hour: number,
  events: CalendarEvent[]
): string[] => {
  const playersStarting = new Set<string>()

  events.forEach(event => {
    if (event.day === day && event.startHour === hour && event.player_name) {
      playersStarting.add(event.player_name)
    }
  })

  return Array.from(playersStarting)
}

/**
 * Gets session information for all sessions starting at a specific time slot
 * @param day - Day of the week (0-6)
 * @param hour - Hour of the day (decimal, e.g., 10.5 for 10:30)
 * @param events - Array of calendar events
 * @returns Array of session information with player name, start hour, and end hour
 */
export const getSessionsStartingAt = (
  day: number,
  hour: number,
  events: CalendarEvent[]
): SessionInfo[] => {
  const sessions: SessionInfo[] = []

  events.forEach(event => {
    if (event.day === day && event.startHour === hour && event.player_name) {
      sessions.push({
        playerName: event.player_name,
        startHour: event.startHour,
        endHour: event.startHour + event.duration,
      })
    }
  })

  return sessions
}

/**
 * Checks if all players have started a session at the exact same cell
 * @param day - Day of the week (0-6)
 * @param hour - Hour of the day (decimal, e.g., 10.5 for 10:30)
 * @param events - Array of calendar events
 * @param totalPlayers - Total number of players
 * @returns True if all players started at this exact cell
 */
export const allPlayersStartedAt = (
  day: number,
  hour: number,
  events: CalendarEvent[],
  totalPlayers: number
): boolean => {
  const playersStarting = getPlayersStartingAt(day, hour, events)
  return playersStarting.length === totalPlayers && totalPlayers > 0
}

/**
 * Checks if a cell is within 3 hours from a session start where all players agreed
 * @param day - Day of the week (0-6)
 * @param hour - Hour of the day (decimal, e.g., 10.5 for 10:30)
 * @param events - Array of calendar events
 * @param totalPlayers - Total number of players
 * @returns True if this cell is part of a 3-hour session where all players started together
 */
export const isInAgreedSession = (
  day: number,
  hour: number,
  events: CalendarEvent[],
  totalPlayers: number
): boolean => {
  // Check if all players started at this exact cell
  if (allPlayersStartedAt(day, hour, events, totalPlayers)) {
    return true
  }

  // Check if all players started at a cell before this one (within 3 hours)
  // We need to check backwards up to 3 hours (6 cells of 0.5 hours each)
  for (let offset = 0.5; offset <= 3; offset += 0.5) {
    const checkHour = hour - offset
    if (
      checkHour >= 0 &&
      allPlayersStartedAt(day, checkHour, events, totalPlayers)
    ) {
      return true
    }
  }

  return false
}

/**
 * Gets sessions from the previous day that extend into the current day (past midnight)
 * @param day - Current day of the week (0-6)
 * @param hour - Hour of the current day (0-23.5)
 * @param events - Array of calendar events
 * @returns Array of sessions that started yesterday and continue into this hour today
 */
export const getSessionsFromPreviousDay = (
  day: number,
  hour: number,
  events: CalendarEvent[]
): CalendarEvent[] => {
  // Previous day wraps around (Saturday 6 -> Sunday 0)
  const previousDay = (day - 1 + 7) % 7
  
  const continuingSessions: CalendarEvent[] = []
  
  events.forEach(event => {
    if (event.day === previousDay) {
      const sessionEnd = event.startHour + event.duration
      
      // If session extends past midnight (24 hours)
      if (sessionEnd > 24) {
        const hoursIntoNextDay = sessionEnd - 24
        
        // Check if current hour falls within the continuation
        if (hour < hoursIntoNextDay) {
          continuingSessions.push(event)
        }
      }
    }
  })
  
  return continuingSessions
}

/**
 * Checks if a cell is part of a session that started on the previous day
 * @param day - Current day of the week (0-6)
 * @param hour - Hour of the current day (0-23.5)
 * @param events - Array of calendar events
 * @returns True if this cell is covered by a session from the previous day
 */
export const isContinuationCell = (
  day: number,
  hour: number,
  events: CalendarEvent[]
): boolean => {
  return getSessionsFromPreviousDay(day, hour, events).length > 0
}
