import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlayerManager } from './usePlayerManager'
import type { Player } from '../lib/supabase'

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

describe('usePlayerManager', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
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

  it('should initialize with empty players', () => {
    const { result } = renderHook(() =>
      usePlayerManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    expect(result.current.players).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should load players successfully', async () => {
    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'Player 1',
        is_gm: false,
        created_at: '2025-01-01',
      },
      {
        id: '2',
        name: 'Player 2',
        is_gm: true,
        created_at: '2025-01-02',
      },
    ]

    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockPlayers, error: null })),
      })),
    }))

    const { result } = renderHook(() =>
      usePlayerManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    await result.current.loadPlayers()

    await waitFor(() => {
      expect(result.current.players).toHaveLength(2)
      expect(result.current.players[0].name).toBe('Player 1')
      expect(result.current.players[1].name).toBe('Player 2')
    })
  })

  it('should filter players by GM status', () => {
    const { result } = renderHook(() =>
      usePlayerManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'Player 1',
        is_gm: false,
        created_at: '2025-01-01',
      },
      {
        id: '2',
        name: 'GM Player',
        is_gm: true,
        created_at: '2025-01-02',
      },
    ]

    result.current.players.push(...mockPlayers)

    const gmPlayers = result.current.getGMPlayers()
    expect(gmPlayers).toHaveLength(1)
    expect(gmPlayers[0].name).toBe('GM Player')

    const regularPlayers = result.current.getRegularPlayers()
    expect(regularPlayers).toHaveLength(1)
    expect(regularPlayers[0].name).toBe('Player 1')
  })

  it('should get player by name', () => {
    const { result } = renderHook(() =>
      usePlayerManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'Player 1',
        is_gm: false,
        created_at: '2025-01-01',
      },
      {
        id: '2',
        name: 'Player 2',
        is_gm: false,
        created_at: '2025-01-02',
      },
    ]

    result.current.players.push(...mockPlayers)

    const player = result.current.getPlayerByName('Player 1')
    expect(player).toBeDefined()
    expect(player?.id).toBe('1')
    expect(player?.name).toBe('Player 1')

    const notFound = result.current.getPlayerByName('Non-existent')
    expect(notFound).toBeUndefined()
  })

  it('should check if player exists by name', () => {
    const { result } = renderHook(() =>
      usePlayerManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'Player 1',
        is_gm: false,
        created_at: '2025-01-01',
      },
    ]

    result.current.players.push(...mockPlayers)

    expect(result.current.playerExists('Player 1')).toBe(true)
    expect(result.current.playerExists('player 1')).toBe(true) // case-insensitive
    expect(result.current.playerExists('Non-existent')).toBe(false)
  })

  it('should get player by id', () => {
    const { result } = renderHook(() =>
      usePlayerManager({
        autoLoad: false,
        enableRealtime: false,
        supabaseClient: mockSupabaseClient,
      })
    )

    const mockPlayers: Player[] = [
      {
        id: '1',
        name: 'Player 1',
        is_gm: false,
        created_at: '2025-01-01',
      },
    ]

    result.current.players.push(...mockPlayers)

    const player = result.current.getPlayerById('1')
    expect(player).toBeDefined()
    expect(player?.name).toBe('Player 1')

    const notFound = result.current.getPlayerById('999')
    expect(notFound).toBeUndefined()
  })
})
