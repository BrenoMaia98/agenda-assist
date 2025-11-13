import { useCallback, useEffect, useState } from 'react'
import { supabase, type Player } from '../lib/supabase'

export interface UsePlayerManagerOptions {
  autoLoad?: boolean
  enableRealtime?: boolean
  supabaseClient?: typeof supabase
}

export const usePlayerManager = (options: UsePlayerManagerOptions = {}) => {
  const {
    autoLoad = true,
    enableRealtime = true,
    supabaseClient = supabase,
  } = options

  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all players
  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabaseClient
        .from('players')
        .select('*')
        .order('name')

      if (fetchError) throw fetchError

      setPlayers(data || [])
      return data || []
    } catch (err) {
      console.error('Error loading players:', err)
      setError(err instanceof Error ? err.message : 'Failed to load players')
      return []
    } finally {
      setLoading(false)
    }
  }, [supabaseClient])

  // Create a new player
  const createPlayer = useCallback(
    async (player: Omit<Player, 'id' | 'created_at'>) => {
      try {
        const { data, error: insertError } = await supabaseClient
          .from('players')
          .insert([player])
          .select()

        if (insertError) throw insertError

        if (data && data[0]) {
          setPlayers(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
          return data[0]
        }

        return null
      } catch (err) {
        console.error('Error creating player:', err)
        setError(err instanceof Error ? err.message : 'Failed to create player')
        throw err
      }
    },
    [supabaseClient]
  )

  // Update a player
  const updatePlayer = useCallback(
    async (id: string, updates: Partial<Omit<Player, 'id' | 'created_at'>>) => {
      try {
        const { data, error: updateError } = await supabaseClient
          .from('players')
          .update(updates)
          .eq('id', id)
          .select()

        if (updateError) throw updateError

        if (data && data[0]) {
          setPlayers(prev =>
            prev.map(p => (p.id === id ? data[0] : p)).sort((a, b) => a.name.localeCompare(b.name))
          )
          return data[0]
        }

        return null
      } catch (err) {
        console.error('Error updating player:', err)
        setError(err instanceof Error ? err.message : 'Failed to update player')
        throw err
      }
    },
    [supabaseClient]
  )

  // Delete a player
  const deletePlayer = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabaseClient
          .from('players')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError

        setPlayers(prev => prev.filter(p => p.id !== id))
        return true
      } catch (err) {
        console.error('Error deleting player:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete player')
        return false
      }
    },
    [supabaseClient]
  )

  // Get player by name
  const getPlayerByName = useCallback(
    (name: string) => {
      return players.find(p => p.name === name)
    },
    [players]
  )

  // Get player by id
  const getPlayerById = useCallback(
    (id: string) => {
      return players.find(p => p.id === id)
    },
    [players]
  )

  // Filter players by GM status
  const filterByGM = useCallback(
    (isGM: boolean) => {
      return players.filter(p => p.is_gm === isGM)
    },
    [players]
  )

  // Check if a player exists by name
  const playerExists = useCallback(
    (name: string) => {
      return players.some(p => p.name.toLowerCase() === name.toLowerCase())
    },
    [players]
  )

  // Get GM players
  const getGMPlayers = useCallback(() => {
    return players.filter(p => p.is_gm)
  }, [players])

  // Get regular players (non-GM)
  const getRegularPlayers = useCallback(() => {
    return players.filter(p => !p.is_gm)
  }, [players])

  // Auto-load players on mount
  useEffect(() => {
    if (autoLoad) {
      loadPlayers()
    }
  }, [autoLoad, loadPlayers])

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime) return

    const channel = supabaseClient
      .channel('players-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        () => {
          loadPlayers()
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [enableRealtime, loadPlayers, supabaseClient])

  return {
    players,
    loading,
    error,
    loadPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer,
    getPlayerByName,
    getPlayerById,
    filterByGM,
    playerExists,
    getGMPlayers,
    getRegularPlayers,
  }
}

