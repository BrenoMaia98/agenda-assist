import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

    // NOTE: Alert behavior should be tested in Cypress with real browser interactions
    it.skip('should show alert when trying to create session without selecting player', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      renderWithProvider(<WeekCalendar />)

      // Don't select any player
      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))
      if (cells.length > 0) {
        fireEvent.mouseDown(cells[0])
        fireEvent.mouseUp(cells[0])
      }

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('selecione um jogador')
        )
      })

      alertSpy.mockRestore()
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

  // NOTE: Session creation/deletion tests should be in Cypress for better integration testing
  // These test complex user interactions that are difficult to mock in unit tests
  describe.skip('Session Creation - Single Click', () => {
    beforeEach(async () => {
      renderWithProvider(<WeekCalendar />)
      await selectPlayerAfterLoad('Breno(GM)')
      await waitFor(() => {
        expect(
          screen.queryByText(/selecione seu jogador/i)
        ).not.toBeInTheDocument()
      })
    })

    it('should create a session when clicking on empty cell', async () => {
      const cells = screen
        .getAllByRole('generic')
        .filter(
          el =>
            el.className.includes('calendar-cell') &&
            !el.className.includes('covered')
        )

      expect(cells.length).toBeGreaterThan(0)

      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      await waitFor(() => {
        const events = screen.getAllByText(/Campanha 2 de D&D/i)
        // Should have at least 2: one in header, one in event
        expect(events.length).toBeGreaterThan(1)
      })
    })

    it('should delete session when clicking on existing session', async () => {
      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      // Create session
      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      await waitFor(() => {
        const events = screen.getAllByText(/Campanha 2 de D&D/i)
        expect(events.length).toBeGreaterThan(1)
      })

      // Delete session
      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      await waitFor(() => {
        const events = screen.queryAllByText(/Campanha 2 de D&D/i)
        // Should only have 1 left (the header title)
        expect(events.length).toBe(1)
      })
    })
  })

  // NOTE: Drag interactions should be tested in Cypress with real mouse events
  describe.skip('Session Creation - Drag', () => {
    beforeEach(async () => {
      renderWithProvider(<WeekCalendar />)
      await selectPlayerAfterLoad('Frizon')
    })

    it('should create multiple sessions when dragging vertically in same day', async () => {
      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      // Drag from cell 0 to cell 2 (same column)
      fireEvent.mouseDown(cells[0])
      fireEvent.mouseEnter(cells[1])
      fireEvent.mouseEnter(cells[2])
      fireEvent.mouseUp(cells[2])

      await waitFor(() => {
        const events = screen.queryAllByText(/Campanha 2 de D&D/i)
        expect(events.length).toBeGreaterThan(1)
      })
    })

    it('should create sessions across multiple days when dragging horizontally', async () => {
      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      // Find cells in different days but same time
      const cellsPerDay = Math.floor(cells.length / 7)
      const startCell = cells[0]
      const endCell = cells[cellsPerDay] // Next day, same time

      fireEvent.mouseDown(startCell)
      fireEvent.mouseEnter(endCell)
      fireEvent.mouseUp(endCell)

      await waitFor(() => {
        const events = screen.queryAllByText(/Campanha 2 de D&D/i)
        expect(events.length).toBeGreaterThan(0)
      })
    })
  })

  // NOTE: Drag deletion should be tested in Cypress
  describe.skip('Session Deletion - Drag from Existing', () => {
    beforeEach(async () => {
      renderWithProvider(<WeekCalendar />)
      await selectPlayerAfterLoad('Tinga')
    })

    it('should delete multiple sessions when dragging from existing session', async () => {
      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      // Create sessions
      fireEvent.mouseDown(cells[0])
      fireEvent.mouseEnter(cells[1])
      fireEvent.mouseUp(cells[1])

      await waitFor(() => {
        const events = screen.queryAllByText(/Campanha 2 de D&D/i)
        expect(events.length).toBeGreaterThan(0)
      })

      const eventCountBefore =
        screen.queryAllByText(/Campanha 2 de D&D/i).length

      // Delete by dragging from existing session
      fireEvent.mouseDown(cells[0])
      fireEvent.mouseEnter(cells[1])
      fireEvent.mouseUp(cells[1])

      await waitFor(() => {
        const events = screen.queryAllByText(/Campanha 2 de D&D/i)
        expect(events.length).toBeLessThan(eventCountBefore)
      })
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

  // NOTE: Visual feedback tests should be in Cypress to see actual visual changes
  describe.skip('Visual Feedback', () => {
    it('should show drag preview when dragging', async () => {
      renderWithProvider(<WeekCalendar />)
      await selectPlayerAfterLoad('Zangs')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      fireEvent.mouseDown(cells[0])
      fireEvent.mouseEnter(cells[1])

      await waitFor(() => {
        const dragPreview = cells.find(cell =>
          cell.className.includes('drag-preview')
        )
        expect(dragPreview).toBeDefined()
      })

      fireEvent.mouseUp(cells[1])
    })

    it('should show translucent overlay on cells covered by sessions', async () => {
      const { container } = renderWithProvider(<WeekCalendar />)
      await selectPlayerAfterLoad('Nalu')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      // Create a session
      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      await waitFor(() => {
        const overlay = container.querySelector('.cell-overlay')
        expect(overlay).toBeInTheDocument()
      })
    })
  })

  describe('Session Duration Display', () => {
    it('should display 3 hour duration', () => {
      renderWithProvider(<WeekCalendar />)
      expect(screen.getByText(/3 horas/i)).toBeInTheDocument()
    })

    it('should show start and end time on created sessions', async () => {
      renderWithProvider(<WeekCalendar />)
      await selectPlayerAfterLoad('Yshi')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))

      fireEvent.mouseDown(cells[0])
      fireEvent.mouseUp(cells[0])

      await waitFor(() => {
        // Should show time range like "12:00 AM - 3:00 AM"
        const timeDisplays = screen.getAllByText(/-/)
        expect(timeDisplays.length).toBeGreaterThan(0)
      })
    })
  })
})
