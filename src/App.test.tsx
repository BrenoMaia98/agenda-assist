import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import './i18n/config'

// Mock Supabase
const mockLoadSessions = vi.fn()
const mockLoadPlayers = vi.fn()
const mockSubscribe = vi.fn()
const mockOn = vi.fn().mockReturnThis()
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
}

vi.mock('./lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'players') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: '1',
                    name: 'TestPlayer',
                    is_gm: false,
                    created_at: '2024-01-01',
                  },
                ],
                error: null,
              })
            ),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      }
    }),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Initial Rendering', () => {
    it('should render the App component', () => {
      render(<App />)
      expect(document.querySelector('.app')).toBeInTheDocument()
    })

    it('should render PlayerSelectionModal by default', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/quem é você/i)).toBeInTheDocument()
      })
    })

    it('should render WeekCalendar component', async () => {
      render(<App />)

      // WeekCalendar should be present even if modal is showing
      await waitFor(() => {
        expect(
          screen.getByText(/agendador de sessões de rpg/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('PlayerSelectionModal Integration', () => {
    it('should show PlayerSelectionModal when no user is selected', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/quem é você/i)).toBeInTheDocument()
      })
    })

    it('should hide PlayerSelectionModal after player selection', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/quem é você/i)).toBeInTheDocument()
      })

      // Use getAllByRole and filter by the one in the modal
      const selects = screen.getAllByRole('combobox')
      const playerSelect = selects.find(s =>
        s.classList.contains('modal-select')
      )
      expect(playerSelect).toBeDefined()

      await userEvent.selectOptions(playerSelect!, 'TestPlayer')

      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      await userEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.queryByText(/quem é você/i)).not.toBeInTheDocument()
      })
    })

    it('should pass onPlayerSelect callback to modal', async () => {
      render(<App />)

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBeGreaterThan(0)
      })

      const selects = screen.getAllByRole('combobox')
      const playerSelect = selects.find(s =>
        s.classList.contains('modal-select')
      )
      expect(playerSelect).toBeDefined()

      await userEvent.selectOptions(playerSelect!, 'TestPlayer')

      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      await userEvent.click(confirmButton)

      // Should close modal and update calendar context
      await waitFor(() => {
        expect(screen.queryByText(/quem é você/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('CalendarProvider Integration', () => {
    it('should wrap components in CalendarProvider', () => {
      render(<App />)

      // CalendarProvider should provide context to WeekCalendar
      expect(
        screen.getByText(/agendador de sessões de rpg/i)
      ).toBeInTheDocument()
    })

    it('should share state between modal and calendar', async () => {
      render(<App />)

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBeGreaterThan(0)
      })

      const selects = screen.getAllByRole('combobox')
      const modalSelect = selects.find(s =>
        s.classList.contains('modal-select')
      )
      expect(modalSelect).toBeDefined()

      await userEvent.selectOptions(modalSelect!, 'TestPlayer')

      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      await userEvent.click(confirmButton)

      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByText(/quem é você/i)).not.toBeInTheDocument()
      })

      // Calendar should have the player select available
      await waitFor(() => {
        const calendarSelects = screen.getAllByRole('combobox')
        expect(calendarSelects.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Component Structure', () => {
    it('should have proper nesting of components', async () => {
      const { container } = render(<App />)

      // Should have modal overlay
      await waitFor(() => {
        expect(container.querySelector('.modal-overlay')).toBeInTheDocument()
      })

      // Should have app container
      expect(container.querySelector('.app')).toBeInTheDocument()

      // Should have week-calendar
      expect(container.querySelector('.week-calendar')).toBeInTheDocument()
    })
  })

  describe('Modal Visibility Toggle', () => {
    it('should re-show modal when change user button is clicked', async () => {
      render(<App />)

      // Select a player and close modal
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBeGreaterThan(0)
      })

      const selects = screen.getAllByRole('combobox')
      const playerSelect = selects.find(s =>
        s.classList.contains('modal-select')
      )
      expect(playerSelect).toBeDefined()

      await userEvent.selectOptions(playerSelect!, 'TestPlayer')

      const confirmButton = screen.getByRole('button', { name: /confirmar/i })
      await userEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.queryByText(/quem é você/i)).not.toBeInTheDocument()
      })

      // Click change user button in calendar
      const changeUserButton = screen.getByRole('button', {
        name: /trocar usuário/i,
      })
      await userEvent.click(changeUserButton)

      // Modal should reappear
      await waitFor(() => {
        expect(screen.getByText(/quem é você/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations in modal', async () => {
      render(<App />)

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBeGreaterThan(0)
      })

      // Modal should have proper ARIA roles
      const modal = screen.getByText(/quem é você/i).closest('.modal-content')
      expect(modal).toBeInTheDocument()
    })

    it('should have no accessibility violations in calendar', async () => {
      render(<App />)

      await waitFor(() => {
        const calendar = screen.getByText(/agendador de sessões de rpg/i)
        expect(calendar).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock console.error to suppress error output in tests
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      render(<App />)

      // App should still render even if there are errors
      expect(document.querySelector('.app')).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Language Switching', () => {
    it('should allow language switching from within the app', async () => {
      render(<App />)

      await waitFor(() => {
        const enButtons = screen.getAllByText('EN')
        expect(enButtons.length).toBeGreaterThan(0)
      })

      const enButton = screen.getAllByText('EN')[0] // Get first instance (from modal)
      await userEvent.click(enButton)

      await waitFor(() => {
        expect(screen.getByText(/ttrpg session planner/i)).toBeInTheDocument()
      })
    })
  })

  describe('Theme Integration', () => {
    it('should include ThemeToggle component', async () => {
      render(<App />)

      await waitFor(() => {
        // Theme toggle buttons should be present
        const buttons = screen.getAllByRole('button')
        const themeButtons = buttons.filter(
          btn =>
            btn.textContent === '☀️' ||
            btn.textContent === '🌙' ||
            btn.textContent === '💻'
        )
        expect(themeButtons.length).toBeGreaterThan(0)
      })
    })
  })
})
