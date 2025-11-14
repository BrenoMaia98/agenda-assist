import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarProvider } from '../../contexts/CalendarContext'
import '../../i18n/config'
import WeekCalendar from './WeekCalendar'

// Mock Supabase to prevent real database calls
const createMockSupabase = () => ({
  from: vi.fn((table: string) => {
    if (table === 'players') {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: '1', name: 'Nalu', is_gm: false, created_at: '2024-01-01' },
              { id: '2', name: 'Yshi', is_gm: false, created_at: '2024-01-02' },
              {
                id: '3',
                name: 'Breno(GM)',
                is_gm: true,
                created_at: '2024-01-03',
              },
              {
                id: '4',
                name: 'Frizon',
                is_gm: false,
                created_at: '2024-01-04',
              },
              {
                id: '5',
                name: 'Tinga',
                is_gm: false,
                created_at: '2024-01-05',
              },
              {
                id: '6',
                name: 'Zangs',
                is_gm: false,
                created_at: '2024-01-06',
              },
            ],
            error: null,
          }),
        }),
      }
    }
    // Default for sessions table
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
  }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  }),
  removeChannel: vi.fn(),
})

const renderWithProvider = (ui: ReactElement) => {
  const mockSupabase = createMockSupabase()
  return render(
    <CalendarProvider supabaseClient={mockSupabase as any}>
      {ui}
    </CalendarProvider>
  )
}

// Helper function to wait for players to load and then select one
const selectPlayerAfterLoad = async (playerName: string) => {
  const select = screen.getByRole('combobox', {
    name: /selecione o jogador/i,
  })

  // Wait for players to load
  await waitFor(
    () => {
      expect(select.querySelectorAll('option').length).toBeGreaterThan(1)
    },
    { timeout: 3000 }
  )

  await userEvent.selectOptions(select, playerName)
  return select
}

describe('WeekCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the calendar title', () => {
      renderWithProvider(<WeekCalendar />)
      expect(
        screen.getByText('Agendador de Sessões de RPG')
      ).toBeInTheDocument()
    })

    it('should render all days of the week', () => {
      renderWithProvider(<WeekCalendar />)
      expect(screen.getByText('Domingo')).toBeInTheDocument()
      expect(screen.getByText('Segunda')).toBeInTheDocument()
      expect(screen.getByText('Terça')).toBeInTheDocument()
      expect(screen.getByText('Quarta')).toBeInTheDocument()
      expect(screen.getByText('Quinta')).toBeInTheDocument()
      expect(screen.getByText('Sexta')).toBeInTheDocument()
      expect(screen.getByText('Sábado')).toBeInTheDocument()
    })

    it('should render language switcher', () => {
      renderWithProvider(<WeekCalendar />)
      expect(screen.getByText('EN')).toBeInTheDocument()
      expect(screen.getByText('PT')).toBeInTheDocument()
    })

    it('should show player select dropdown', () => {
      renderWithProvider(<WeekCalendar />)
      expect(
        screen.getByRole('combobox', { name: /selecione o jogador/i })
      ).toBeInTheDocument()
    })

    it('should show session title and duration', () => {
      renderWithProvider(<WeekCalendar />)
      expect(screen.getByText(/Campanha/i)).toBeInTheDocument()
      expect(screen.getByText(/3 horas/i)).toBeInTheDocument()
    })

    it('should show calendar overlay when no player is selected', () => {
      renderWithProvider(<WeekCalendar />)
      expect(
        screen.getByText(/selecione seu jogador para interagir/i)
      ).toBeInTheDocument()
    })
  })

  describe('Player Name Validation', () => {
    it('should enable calendar when a player is selected', async () => {
      renderWithProvider(<WeekCalendar />)

      await selectPlayerAfterLoad('Nalu')

      await waitFor(() => {
        expect(
          screen.queryByText(/selecione seu jogador para interagir/i)
        ).not.toBeInTheDocument()
      })
    })

    it('should update required badge based on player selection', async () => {
      renderWithProvider(<WeekCalendar />)

      expect(screen.getByText('Obrigatório')).toBeInTheDocument()

      const select = await selectPlayerAfterLoad('Yshi')
      expect(screen.queryByText('Obrigatório')).not.toBeInTheDocument()

      await userEvent.selectOptions(select, '')
      expect(screen.getByText('Obrigatório')).toBeInTheDocument()

      await userEvent.selectOptions(select, 'Nalu')
      expect(screen.queryByText('Obrigatório')).not.toBeInTheDocument()
    })
  })

  describe('Language Switching', () => {
    it('should switch to English when clicking EN button', async () => {
      renderWithProvider(<WeekCalendar />)

      const enButton = screen.getByText('EN')
      await userEvent.click(enButton)

      await waitFor(() => {
        expect(screen.getByText('TTRPG Session Planner')).toBeInTheDocument()
        expect(screen.getByText('Sunday')).toBeInTheDocument()
      })
    })

    it('should display Portuguese by default', () => {
      renderWithProvider(<WeekCalendar />)
      expect(
        screen.getByText('Agendador de Sessões de RPG')
      ).toBeInTheDocument()
      expect(screen.getByText('Domingo')).toBeInTheDocument()
    })
  })

  describe('Session Duration Display', () => {
    it('should display 3 hour duration', () => {
      renderWithProvider(<WeekCalendar />)
      expect(screen.getByText(/3 horas/i)).toBeInTheDocument()
    })
  })
})
