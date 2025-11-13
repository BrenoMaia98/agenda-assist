import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '../contexts/types'
import { supabase } from '../lib/supabase'

export interface SessionFilters {
  playerName?: string
  day?: number
  startHour?: number
}

export interface UseSessionManagerOptions {
  autoLoad?: boolean
  enableRealtime?: boolean
  supabaseClient?: typeof supabase
}

export const useSessionManager = (options: UseSessionManagerOptions = {}) => {
  const {
    autoLoad = true,
    enableRealtime = true,
    supabaseClient = supabase,
  } = options

  const [sessions, setSessions] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSavingRef = useRef(false)

  // Load sessions with optional filters
  const loadSessions = useCallback(
    async (filters?: SessionFilters) => {
      try {
        setLoading(true)
        setError(null)

        let query = supabaseClient.from('sessions').select('*')

        // Apply filters
        if (filters?.playerName) {
          query = query.eq('player_name', filters.playerName)
        }
        if (filters?.day !== undefined) {
          query = query.eq('day', filters.day)
        }
        if (filters?.startHour !== undefined) {
          query = query.eq('start_hour', filters.startHour)
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        // Convert database sessions to calendar events
        const calendarEvents: CalendarEvent[] = (data || []).map(session => ({
          id: session.id,
          day: session.day,
          startHour: session.start_hour,
          duration: session.duration,
          title: session.title,
          player_name: session.player_name,
        }))

        setSessions(calendarEvents)
        return calendarEvents
      } catch (err) {
        console.error('Error loading sessions:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sessions')
        return []
      } finally {
        setLoading(false)
      }
    },
    [supabaseClient]
  )

  // Create a single session
  const createSession = useCallback(
    async (session: Omit<CalendarEvent, 'id'>) => {
      try {
        const sessionToInsert = {
          player_name: session.player_name || '',
          day: session.day,
          start_hour: session.startHour,
          duration: session.duration,
          title: session.title,
        }

        const { data, error: insertError } = await supabaseClient
          .from('sessions')
          .insert([sessionToInsert])
          .select()

        if (insertError) throw insertError

        if (data && data[0]) {
          const newEvent: CalendarEvent = {
            id: data[0].id,
            day: data[0].day,
            startHour: data[0].start_hour,
            duration: data[0].duration,
            title: data[0].title,
            player_name: data[0].player_name,
          }
          setSessions(prev => [...prev, newEvent])
          return newEvent
        }

        return null
      } catch (err) {
        console.error('Error creating session:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to create session'
        )
        throw err
      }
    },
    [supabaseClient]
  )

  // Create multiple sessions
  const createSessions = useCallback(
    async (newSessions: Omit<CalendarEvent, 'id'>[]) => {
      try {
        isSavingRef.current = true

        const sessionsToInsert = newSessions.map(session => ({
          player_name: session.player_name || '',
          day: session.day,
          start_hour: session.startHour,
          duration: session.duration,
          title: session.title,
        }))

        const { data, error: insertError } = await supabaseClient
          .from('sessions')
          .insert(sessionsToInsert)
          .select()

        if (insertError) throw insertError

        if (data) {
          const newEvents: CalendarEvent[] = data.map(session => ({
            id: session.id,
            day: session.day,
            startHour: session.start_hour,
            duration: session.duration,
            title: session.title,
            player_name: session.player_name,
          }))
          setSessions(prev => [...prev, ...newEvents])
          return newEvents
        }

        return []
      } catch (err) {
        console.error('Error creating sessions:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to create sessions'
        )
        throw err
      } finally {
        isSavingRef.current = false
      }
    },
    [supabaseClient]
  )

  // Delete a single session
  const deleteSession = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabaseClient
          .from('sessions')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError

        setSessions(prev => prev.filter(s => s.id !== id))
        return true
      } catch (err) {
        console.error('Error deleting session:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to delete session'
        )
        return false
      }
    },
    [supabaseClient]
  )

  // Delete multiple sessions
  const deleteSessions = useCallback(
    async (ids: string[]) => {
      try {
        isSavingRef.current = true

        for (const id of ids) {
          const { error: deleteError } = await supabaseClient
            .from('sessions')
            .delete()
            .eq('id', id)

          if (deleteError) {
            console.error('Error deleting session:', deleteError)
          }
        }

        setSessions(prev => prev.filter(s => !ids.includes(s.id)))
        return true
      } catch (err) {
        console.error('Error deleting sessions:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to delete sessions'
        )
        return false
      } finally {
        isSavingRef.current = false
      }
    },
    [supabaseClient]
  )

  // Filter sessions by player
  const filterByPlayer = useCallback(
    (playerName: string) => {
      return sessions.filter(s => s.player_name === playerName)
    },
    [sessions]
  )

  // Get sessions at a specific time slot
  const getSessionsAt = useCallback(
    (day: number, hour: number) => {
      return sessions.filter(s => {
        const sessionEnd = s.startHour + s.duration
        return s.day === day && s.startHour <= hour && sessionEnd > hour
      })
    },
    [sessions]
  )

  // Get sessions starting at a specific time
  const getSessionsStartingAt = useCallback(
    (day: number, hour: number) => {
      return sessions.filter(s => s.day === day && s.startHour === hour)
    },
    [sessions]
  )

  // Get unique players from sessions
  const getUniquePlayers = useCallback(() => {
    const players = new Set(
      sessions.map(s => s.player_name).filter((name): name is string => !!name)
    )
    return Array.from(players)
  }, [sessions])

  // Auto-load sessions on mount
  useEffect(() => {
    if (autoLoad) {
      loadSessions()
    }
  }, [autoLoad, loadSessions])

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime) return

    const channel = supabaseClient
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          // Reload sessions when any change occurs (but not if we're in the middle of saving)
          if (!isSavingRef.current) {
            loadSessions()
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [enableRealtime, loadSessions, supabaseClient])

  return {
    sessions,
    loading,
    error,
    loadSessions,
    createSession,
    createSessions,
    deleteSession,
    deleteSessions,
    filterByPlayer,
    getSessionsAt,
    getSessionsStartingAt,
    getUniquePlayers,
  }
}
