import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n/config'
import WeekCalendar from './WeekCalendar'

describe('WeekCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render the calendar title', () => {
      render(<WeekCalendar />)
      expect(
        screen.getByText('Agendador de Sessões de RPG')
      ).toBeInTheDocument()
    })

    it('should render all days of the week', () => {
      render(<WeekCalendar />)
      expect(screen.getByText('Domingo')).toBeInTheDocument()
      expect(screen.getByText('Segunda')).toBeInTheDocument()
      expect(screen.getByText('Terça')).toBeInTheDocument()
      expect(screen.getByText('Quarta')).toBeInTheDocument()
      expect(screen.getByText('Quinta')).toBeInTheDocument()
      expect(screen.getByText('Sexta')).toBeInTheDocument()
      expect(screen.getByText('Sábado')).toBeInTheDocument()
    })

    it('should render language switcher', () => {
      render(<WeekCalendar />)
      expect(screen.getByText('EN')).toBeInTheDocument()
      expect(screen.getByText('PT')).toBeInTheDocument()
    })

    it('should show player name input', () => {
      render(<WeekCalendar />)
      expect(
        screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      ).toBeInTheDocument()
    })

    it('should show session title and duration', () => {
      render(<WeekCalendar />)
      expect(screen.getByText(/Campanha/i)).toBeInTheDocument()
      expect(screen.getByText(/3 horas/i)).toBeInTheDocument()
    })

    it('should show calendar overlay when player name is empty', () => {
      render(<WeekCalendar />)
      expect(
        screen.getByText(/insira seu nome de jogador para interagir/i)
      ).toBeInTheDocument()
    })
  })

  describe('Player Name Validation', () => {
    it('should enable calendar when player name has 3+ characters', async () => {
      render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)

      await userEvent.type(input, 'Bob')

      await waitFor(() => {
        expect(
          screen.queryByText(/insira seu nome de jogador para interagir/i)
        ).not.toBeInTheDocument()
      })
    })

    it('should show alert when trying to create session with short name', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      render(<WeekCalendar />)

      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      await userEvent.type(input, 'AB')

      const cells = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('calendar-cell'))
      if (cells.length > 0) {
        fireEvent.mouseDown(cells[0])
        fireEvent.mouseUp(cells[0])
      }

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('pelo menos 3 caracteres')
        )
      })

      alertSpy.mockRestore()
    })

    it('should update required badge based on character count', async () => {
      render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)

      expect(screen.getByText('Obrigatório')).toBeInTheDocument()

      await userEvent.type(input, 'A')
      expect(screen.queryByText('Obrigatório')).not.toBeInTheDocument()

      await userEvent.clear(input)
      expect(screen.getByText('Obrigatório')).toBeInTheDocument()

      await userEvent.type(input, 'ABC')
      expect(screen.queryByText('Obrigatório')).not.toBeInTheDocument()
    })
  })

  describe('Session Creation - Single Click', () => {
    beforeEach(async () => {
      render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      await userEvent.type(input, 'TestUser')
      await waitFor(() => {
        expect(
          screen.queryByText(/insira seu nome de jogador/i)
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

  describe('Session Creation - Drag', () => {
    beforeEach(async () => {
      render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      await userEvent.type(input, 'TestUser')
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

  describe('Session Deletion - Drag from Existing', () => {
    beforeEach(async () => {
      render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      await userEvent.type(input, 'TestUser')
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
      render(<WeekCalendar />)

      const enButton = screen.getByText('EN')
      await userEvent.click(enButton)

      await waitFor(() => {
        expect(screen.getByText('TTRPG Session Planner')).toBeInTheDocument()
        expect(screen.getByText('Sunday')).toBeInTheDocument()
      })
    })

    it('should display Portuguese by default', () => {
      render(<WeekCalendar />)
      expect(
        screen.getByText('Agendador de Sessões de RPG')
      ).toBeInTheDocument()
      expect(screen.getByText('Domingo')).toBeInTheDocument()
    })
  })

  describe('Visual Feedback', () => {
    it('should show drag preview when dragging', async () => {
      render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      await userEvent.type(input, 'TestUser')

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
      const { container } = render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      await userEvent.type(input, 'TestUser')

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
      render(<WeekCalendar />)
      expect(screen.getByText(/3 horas/i)).toBeInTheDocument()
    })

    it('should show start and end time on created sessions', async () => {
      render(<WeekCalendar />)
      const input = screen.getByPlaceholderText(/Digite seu nome de jogador/i)
      await userEvent.type(input, 'TestUser')

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
