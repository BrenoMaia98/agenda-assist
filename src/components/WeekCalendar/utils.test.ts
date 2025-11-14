import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../../contexts/types'
import {
  formatTime,
  getPlayersAtTimeSlot,
  getPlayersStartingAt,
  getSessionsStartingAt,
} from './utils'

describe('WeekCalendar Utils', () => {
  describe('formatTime', () => {
    it('should format midnight (0) as 12:00 AM', () => {
      expect(formatTime(0)).toBe('12:00 AM')
    })

    it('should format noon (12) as 12:00 PM', () => {
      expect(formatTime(12)).toBe('12:00 PM')
    })

    it('should format half hours correctly', () => {
      expect(formatTime(10.5)).toBe('10:30 AM')
      expect(formatTime(14.5)).toBe('2:30 PM')
      expect(formatTime(23.5)).toBe('11:30 PM')
    })

    it('should format morning hours correctly', () => {
      expect(formatTime(1)).toBe('1:00 AM')
      expect(formatTime(9)).toBe('9:00 AM')
      expect(formatTime(11)).toBe('11:00 AM')
    })

    it('should format afternoon/evening hours correctly', () => {
      expect(formatTime(13)).toBe('1:00 PM')
      expect(formatTime(18)).toBe('6:00 PM')
      expect(formatTime(23)).toBe('11:00 PM')
    })

    it('should handle minutes close to 59 (23.98)', () => {
      // 23.98 * 60 % 60 = 58.8 minutes, which pads to "58:48"
      // Using a cleaner test case: 23 hours 59 minutes = 23 + 59/60 = 23.983333...
      const result = formatTime(23 + 59 / 60)
      expect(result).toBe('11:59 PM')
    })

    it('should handle quarter hours', () => {
      expect(formatTime(10.25)).toBe('10:15 AM')
      expect(formatTime(14.75)).toBe('2:45 PM')
    })
  })

  describe('getPlayersAtTimeSlot', () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Session 1',
        player_name: 'Player1',
      },
      {
        id: '2',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Session 2',
        player_name: 'Player2',
      },
      {
        id: '3',
        day: 1,
        startHour: 14,
        duration: 2,
        title: 'Session 3',
        player_name: 'Player3',
      },
      {
        id: '4',
        day: 0,
        startHour: 15,
        duration: 3,
        title: 'Session 4',
        player_name: 'Player1',
      },
    ]

    it('should return empty array for empty events', () => {
      const result = getPlayersAtTimeSlot(0, 10, [])
      expect(result).toEqual([])
    })

    it('should return empty array when no players at time slot', () => {
      const result = getPlayersAtTimeSlot(0, 5, mockEvents)
      expect(result).toEqual([])
    })

    it('should return single player at time slot', () => {
      const result = getPlayersAtTimeSlot(1, 14, mockEvents)
      expect(result).toEqual(['Player3'])
    })

    it('should return multiple players at overlapping time slot', () => {
      const result = getPlayersAtTimeSlot(0, 10, mockEvents)
      expect(result).toHaveLength(2)
      expect(result).toContain('Player1')
      expect(result).toContain('Player2')
    })

    it('should include players whose sessions cover the time slot (not just starting)', () => {
      // Session starts at 10, duration 3, so covers 10, 10.5, 11, 11.5, 12, 12.5
      const result = getPlayersAtTimeSlot(0, 11.5, mockEvents)
      expect(result).toHaveLength(2)
      expect(result).toContain('Player1')
      expect(result).toContain('Player2')
    })

    it('should not include players whose sessions have ended', () => {
      // Session starts at 10, duration 3, ends at 13
      const result = getPlayersAtTimeSlot(0, 13, mockEvents)
      expect(result).toEqual([])
    })

    it('should handle different days correctly', () => {
      const result = getPlayersAtTimeSlot(1, 10, mockEvents)
      expect(result).toEqual([])
    })

    it('should handle sessions without player_name', () => {
      const eventsWithNull: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Session',
          player_name: undefined,
        },
      ]
      const result = getPlayersAtTimeSlot(0, 10, eventsWithNull)
      expect(result).toEqual([])
    })

    it('should deduplicate player names (though unlikely in practice)', () => {
      const duplicateEvents: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Session 1',
          player_name: 'Player1',
        },
        {
          id: '2',
          day: 0,
          startHour: 11,
          duration: 3,
          title: 'Session 2',
          player_name: 'Player1',
        },
      ]
      const result = getPlayersAtTimeSlot(0, 11.5, duplicateEvents)
      expect(result).toEqual(['Player1'])
    })

    it('should handle half-hour time slots', () => {
      const result = getPlayersAtTimeSlot(0, 10.5, mockEvents)
      expect(result).toHaveLength(2)
    })
  })

  describe('getPlayersStartingAt', () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Session 1',
        player_name: 'Player1',
      },
      {
        id: '2',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Session 2',
        player_name: 'Player2',
      },
      {
        id: '3',
        day: 1,
        startHour: 14,
        duration: 2,
        title: 'Session 3',
        player_name: 'Player3',
      },
    ]

    it('should return empty array when no sessions start at time slot', () => {
      const result = getPlayersStartingAt(0, 11, mockEvents)
      expect(result).toEqual([])
    })

    it('should return single player starting at time slot', () => {
      const result = getPlayersStartingAt(1, 14, mockEvents)
      expect(result).toEqual(['Player3'])
    })

    it('should return multiple players starting at same time slot', () => {
      const result = getPlayersStartingAt(0, 10, mockEvents)
      expect(result).toHaveLength(2)
      expect(result).toContain('Player1')
      expect(result).toContain('Player2')
    })

    it('should not return players whose sessions just cover the time (not starting)', () => {
      // Session starts at 10, so 11 is covered but not starting
      const result = getPlayersStartingAt(0, 11, mockEvents)
      expect(result).toEqual([])
    })

    it('should handle different days correctly', () => {
      const result = getPlayersStartingAt(2, 10, mockEvents)
      expect(result).toEqual([])
    })

    it('should ignore sessions without player_name', () => {
      const eventsWithNull: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Session',
          player_name: undefined,
        },
      ]
      const result = getPlayersStartingAt(0, 10, eventsWithNull)
      expect(result).toEqual([])
    })

    it('should deduplicate player names using Set', () => {
      const duplicateEvents: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Session 1',
          player_name: 'Player1',
        },
        {
          id: '2',
          day: 0,
          startHour: 10,
          duration: 2,
          title: 'Session 2',
          player_name: 'Player1',
        },
      ]
      const result = getPlayersStartingAt(0, 10, duplicateEvents)
      expect(result).toEqual(['Player1'])
    })

    it('should handle half-hour start times', () => {
      const halfHourEvents: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10.5,
          duration: 3,
          title: 'Session',
          player_name: 'Player1',
        },
      ]
      const result = getPlayersStartingAt(0, 10.5, halfHourEvents)
      expect(result).toEqual(['Player1'])
    })
  })

  describe('getSessionsStartingAt', () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Session 1',
        player_name: 'Player1',
      },
      {
        id: '2',
        day: 0,
        startHour: 10,
        duration: 2,
        title: 'Session 2',
        player_name: 'Player2',
      },
      {
        id: '3',
        day: 1,
        startHour: 14,
        duration: 3,
        title: 'Session 3',
        player_name: 'Player3',
      },
    ]

    it('should return empty array when no sessions start at time slot', () => {
      const result = getSessionsStartingAt(0, 11, mockEvents)
      expect(result).toEqual([])
    })

    it('should return session info for single session starting at time slot', () => {
      const result = getSessionsStartingAt(1, 14, mockEvents)
      expect(result).toEqual([
        {
          playerName: 'Player3',
          startHour: 14,
          endHour: 17,
        },
      ])
    })

    it('should return multiple sessions starting at same time slot', () => {
      const result = getSessionsStartingAt(0, 10, mockEvents)
      expect(result).toHaveLength(2)
      expect(result).toContainEqual({
        playerName: 'Player1',
        startHour: 10,
        endHour: 13,
      })
      expect(result).toContainEqual({
        playerName: 'Player2',
        startHour: 10,
        endHour: 12,
      })
    })

    it('should calculate correct endHour based on duration', () => {
      const result = getSessionsStartingAt(0, 10, mockEvents)
      const player1Session = result.find(s => s.playerName === 'Player1')
      expect(player1Session?.endHour).toBe(13) // 10 + 3
    })

    it('should handle different days correctly', () => {
      const result = getSessionsStartingAt(2, 10, mockEvents)
      expect(result).toEqual([])
    })

    it('should ignore sessions without player_name', () => {
      const eventsWithNull: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Session',
          player_name: undefined,
        },
      ]
      const result = getSessionsStartingAt(0, 10, eventsWithNull)
      expect(result).toEqual([])
    })

    it('should handle half-hour durations', () => {
      const halfHourEvents: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10,
          duration: 1.5,
          title: 'Session',
          player_name: 'Player1',
        },
      ]
      const result = getSessionsStartingAt(0, 10, halfHourEvents)
      expect(result).toEqual([
        {
          playerName: 'Player1',
          startHour: 10,
          endHour: 11.5,
        },
      ])
    })

    it('should handle sessions spanning midnight', () => {
      const midnightEvents: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 23,
          duration: 3,
          title: 'Session',
          player_name: 'Player1',
        },
      ]
      const result = getSessionsStartingAt(0, 23, midnightEvents)
      expect(result).toEqual([
        {
          playerName: 'Player1',
          startHour: 23,
          endHour: 26, // Note: This goes beyond 24, might need validation in actual usage
        },
      ])
    })

    it('should not deduplicate sessions from same player (allows multiple)', () => {
      const multipleSessionsEvents: CalendarEvent[] = [
        {
          id: '1',
          day: 0,
          startHour: 10,
          duration: 3,
          title: 'Session 1',
          player_name: 'Player1',
        },
        {
          id: '2',
          day: 0,
          startHour: 10,
          duration: 2,
          title: 'Session 2',
          player_name: 'Player1',
        },
      ]
      const result = getSessionsStartingAt(0, 10, multipleSessionsEvents)
      expect(result).toHaveLength(2)
    })
  })
})
