import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSessionManager } from './useSessionManager'
import type { CalendarEvent } from '../contexts/types'

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

describe('useSessionManager', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
          data: [],
          error: null,
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null,
          })),
        })),
      })),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(),
        })),
      })),
      removeChannel: vi.fn(),
    }
  })

  it('should initialize with empty sessions', () => {
    const { result } = renderHook(() =>
      useSessionManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    expect(result.current.sessions).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should load sessions successfully', async () => {
    const mockSessions = [
      {
        id: '1',
        player_name: 'Player 1',
        day: 0,
        start_hour: 10,
        duration: 3,
        title: 'Session 1',
      },
    ]

    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: mockSessions, error: null })),
    }))

    const { result } = renderHook(() =>
      useSessionManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    await result.current.loadSessions()

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
      expect(result.current.sessions[0].id).toBe('1')
      expect(result.current.sessions[0].player_name).toBe('Player 1')
    })
  })

  it('should filter sessions by player name', async () => {
    const mockSessions = [
      {
        id: '1',
        player_name: 'Player 1',
        day: 0,
        start_hour: 10,
        duration: 3,
        title: 'Session 1',
      },
      {
        id: '2',
        player_name: 'Player 2',
        day: 1,
        start_hour: 14,
        duration: 3,
        title: 'Session 2',
      },
    ]

    const mockQuery = {
      eq: vi.fn(() =>
        Promise.resolve({ data: [mockSessions[0]], error: null })
      ),
    }

    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => mockQuery),
    }))

    const { result } = renderHook(() =>
      useSessionManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    await result.current.loadSessions({ playerName: 'Player 1' })

    await waitFor(() => {
      expect(mockQuery.eq).toHaveBeenCalledWith('player_name', 'Player 1')
      expect(result.current.sessions).toHaveLength(1)
      expect(result.current.sessions[0].player_name).toBe('Player 1')
    })
  })

  it('should get sessions at a specific time slot', () => {
    const { result } = renderHook(() =>
      useSessionManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    // Manually set sessions for testing
    const mockSessions: CalendarEvent[] = [
      {
        id: '1',
        player_name: 'Player 1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Session 1',
      },
      {
        id: '2',
        player_name: 'Player 2',
        day: 0,
        startHour: 14,
        duration: 3,
        title: 'Session 2',
      },
    ]

    // Simulate loaded sessions
    result.current.sessions.push(...mockSessions)

    const sessionsAt11 = result.current.getSessionsAt(0, 11)
    expect(sessionsAt11).toHaveLength(1)
    expect(sessionsAt11[0].id).toBe('1')

    const sessionsAt15 = result.current.getSessionsAt(0, 15)
    expect(sessionsAt15).toHaveLength(1)
    expect(sessionsAt15[0].id).toBe('2')

    const sessionsAt20 = result.current.getSessionsAt(0, 20)
    expect(sessionsAt20).toHaveLength(0)
  })

  it('should get unique players from sessions', () => {
    const { result } = renderHook(() =>
      useSessionManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    const mockSessions: CalendarEvent[] = [
      {
        id: '1',
        player_name: 'Player 1',
        day: 0,
        startHour: 10,
        duration: 3,
        title: 'Session 1',
      },
      {
        id: '2',
        player_name: 'Player 1',
        day: 1,
        startHour: 10,
        duration: 3,
        title: 'Session 2',
      },
      {
        id: '3',
        player_name: 'Player 2',
        day: 0,
        startHour: 14,
        duration: 3,
        title: 'Session 3',
      },
    ]

    result.current.sessions.push(...mockSessions)

    const uniquePlayers = result.current.getUniquePlayers()
    expect(uniquePlayers).toHaveLength(2)
    expect(uniquePlayers).toContain('Player 1')
    expect(uniquePlayers).toContain('Player 2')
  })
})
