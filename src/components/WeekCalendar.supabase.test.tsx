import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n/config'
import WeekCalendar from './WeekCalendar'
import {
  clearMockData,
  getMockChannel,
  setMockError,
  setMockSessionsData,
  supabase,
  triggerRealtimeUpdate,
} from '../lib/__mocks__/supabase'

// Mock the supabase module
vi.mock('../lib/supabase', () => import('../lib/__mocks__/supabase'))

describe('WeekCalendar - Supabase Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMockData()
  })

  describe('Database Loading', () => {
    it('should load sessions from database on mount', async () => {
      const mockSessions = [
        {
          id: '1',
          player_name: 'Yshi',
          day: 1,
          start_hour: 14,
          duration: 3,
          title: 'Test Session',
          created_at: new Date().toISOString(),
        },
      ]
      setMockSessionsData(mockSessions)

      render(<WeekCalendar />)

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('sessions')
      })
    })

    it('should show loading state while fetching data', () => {
      render(<WeekCalendar />)
      expect(screen.getByText(/carregando sessões/i)).toBeInTheDocument()
    })

    it('should handle database errors gracefully', async () => {
      setMockError({ message: 'Database error' })

      render(<WeekCalendar />)

      await waitFor(() => {
        expect(screen.getByText(/falha ao carregar sessões/i)).toBeInTheDocument()
      })
    })
  })

  describe('View Mode Toggle', () => {
    it('should render view toggle buttons', () => {
      render(<WeekCalendar />)

      expect(screen.getByText(/minha disponibilidade/i)).toBeInTheDocument()
      expect(screen.getByText(/todos os jogadores/i)).toBeInTheDocument()
    })

    it('should start with "All Players" view selected', () => {
      render(<WeekCalendar />)

      const allPlayersButton = screen.getByText(/todos os jogadores/i)
      expect(allPlayersButton).toHaveStyle({ fontWeight: 'bold' })
    })

    it('should switch to personal view when clicked', async () => {
      render(<WeekCalendar />)

      const myAvailabilityButton = screen.getByText(/minha disponibilidade/i)
      await userEvent.click(myAvailabilityButton)

      expect(myAvailabilityButton).toHaveStyle({ fontWeight: 'bold' })
    })

    it('should query database when view mode changes', async () => {
      const mockSessions = [
        {
          id: '1',
          player_name: 'Yshi',
          day: 1,
          start_hour: 14,
          duration: 3,
          title: 'Yshi Session',
          created_at: new Date().toISOString(),
        },
      ]
      setMockSessionsData(mockSessions)

      render(<WeekCalendar />)

      // Wait for initial load
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled()
      })

      const initialCalls = (supabase.from as any).mock.calls.length

      // Switch to personal view
      const myAvailabilityButton = screen.getByText(/minha disponibilidade/i)
      await userEvent.click(myAvailabilityButton)

      // Should trigger another database query
      await waitFor(() => {
        expect((supabase.from as any).mock.calls.length).toBeGreaterThan(initialCalls)
      })
    })
  })

  describe('Debounced Save - Countdown', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('should show countdown indicator after creating session', async () => {
      render(<WeekCalendar />)

      const select = screen.getByRole('combobox', { name: /selecione o jogador/i })
      await userEvent.selectOptions(select, 'Yshi')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      await waitFor(() => {
        expect(screen.getByText(/salvando em 5s/i)).toBeInTheDocument()
      })
    })

    it('should update countdown as time passes', async () => {
      render(<WeekCalendar />)

      const select = screen.getByRole('combobox', { name: /selecione o jogador/i })
      await userEvent.selectOptions(select, 'Yshi')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      // Starts at 5
      await waitFor(() => {
        expect(screen.getByText(/salvando em 5s/i)).toBeInTheDocument()
      })

      // Advance 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000)
        await Promise.resolve()
      })

      // Should now show 4
      await waitFor(() => {
        expect(screen.getByText(/salvando em 4s/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    }, 10000)
  })

  describe('Optimistic Updates', () => {
    it('should show countdown indicator when session created', async () => {
      render(<WeekCalendar />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/carregando sessões/i)).not.toBeInTheDocument()
      })

      const select = screen.getByRole('combobox', { name: /selecione o jogador/i })
      await userEvent.selectOptions(select, 'Yshi')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      // Countdown indicator should appear immediately
      await waitFor(() => {
        expect(screen.getByText(/salvando em/i)).toBeInTheDocument()
      })
    })

    it('should allow creating multiple sessions quickly', async () => {
      render(<WeekCalendar />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/carregando sessões/i)).not.toBeInTheDocument()
      })

      const select = screen.getByRole('combobox', { name: /selecione o jogador/i })
      await userEvent.selectOptions(select, 'Yshi')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      // Create multiple sessions
      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      fireEvent.mouseDown(cells[1])
      fireEvent.mouseUp(cells[1])

      // Countdown should still be active
      await waitFor(() => {
        expect(screen.getByText(/salvando em/i)).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should set up real-time channel on mount', () => {
      render(<WeekCalendar />)

      expect(supabase.channel).toHaveBeenCalledWith('sessions-changes')
      const mockChannel = getMockChannel()
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should clean up channel on unmount', () => {
      const { unmount } = render(<WeekCalendar />)

      unmount()

      expect(supabase.removeChannel).toHaveBeenCalled()
    })
  })

  describe('Data Persistence', () => {
    it('should not call database insert immediately after change', async () => {
      render(<WeekCalendar />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/carregando sessões/i)).not.toBeInTheDocument()
      })

      const select = screen.getByRole('combobox', { name: /selecione o jogador/i })
      await userEvent.selectOptions(select, 'Yshi')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      const initialInsertCalls = (supabase.from('sessions').insert as any).mock.calls.length

      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      // Countdown should appear
      await waitFor(() => {
        expect(screen.getByText(/salvando em 5s/i)).toBeInTheDocument()
      })

      // Insert should not be called immediately (countdown is active)
      expect((supabase.from('sessions').insert as any).mock.calls.length).toBe(initialInsertCalls)
    })
  })
})
