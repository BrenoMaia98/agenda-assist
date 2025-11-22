import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PlayerSelectionModal from './PlayerSelectionModal'
import '../../i18n/config'

// Mock Supabase
const mockSubscribe = vi.fn()
const mockOn = vi.fn().mockReturnThis()
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}))

// Import after mocking
import { supabase } from '../../lib/supabase'

describe('PlayerSelectionModal', () => {
  const mockOnPlayerSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render modal with title and description', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      expect(screen.getByText(/quem é você/i)).toBeInTheDocument()
      expect(
        screen.getByText(/selecione seu jogador para personalizar/i)
      ).toBeInTheDocument()
    })

    it('should render language switcher', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      expect(screen.getByText('EN')).toBeInTheDocument()
      expect(screen.getByText('PT')).toBeInTheDocument()
    })

    it('should render select dropdown', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      expect(select).toHaveClass('modal-select')
    })

    it('should render confirm button', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      const button = screen.getByRole('button', { name: /confirmar/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('modal-confirm-button')
    })
  })

  describe('Loading State', () => {
    it('should show loading state while fetching players', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      // During initial render, loading should be true
      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()
    })

    it('should display "Loading..." option text when loading', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Player List Display', () => {
    beforeEach(() => {
      const mockPlayers = [
        { id: '1', name: 'Player1', is_gm: false, created_at: '2024-01-01' },
        { id: '2', name: 'Player2', is_gm: true, created_at: '2024-01-02' },
        { id: '3', name: 'Player3', is_gm: false, created_at: '2024-01-03' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockPlayers, error: null })
          ),
        })),
      } as any)
    })

    it('should display players from Supabase', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(screen.getByText('Player1')).toBeInTheDocument()
      })

      expect(screen.getByText('Player2 (GM)')).toBeInTheDocument()
      expect(screen.getByText('Player3')).toBeInTheDocument()
    })

    it('should show GM badge for GM players', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(screen.getByText(/Player2.*\(GM\)/i)).toBeInTheDocument()
      })
    })

    it('should not show GM badge for non-GM players', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        const player1Option = screen.getByText('Player1')
        expect(player1Option.textContent).toBe('Player1')
      })
    })

    it('should enable select after loading', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        const select = screen.getByRole('combobox')
        expect(select).not.toBeDisabled()
      })
    })
  })

  describe('Player Selection', () => {
    beforeEach(() => {
      const mockPlayers = [
        { id: '1', name: 'Player1', is_gm: false, created_at: '2024-01-01' },
        { id: '2', name: 'Player2', is_gm: true, created_at: '2024-01-02' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockPlayers, error: null })
          ),
        })),
      } as any)
    })

    it('should start with empty selection', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement
        expect(select.value).toBe('')
      })
    })

    it('should update selection when player is chosen', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(screen.getByText('Player1')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await userEvent.selectOptions(select, 'Player1')

      expect((select as HTMLSelectElement).value).toBe('Player1')
    })

    it('should allow changing selection', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(screen.getByText('Player1')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await userEvent.selectOptions(select, 'Player1')
      expect((select as HTMLSelectElement).value).toBe('Player1')

      await userEvent.selectOptions(select, 'Player2')
      expect((select as HTMLSelectElement).value).toBe('Player2')
    })
  })

  describe('Confirm Button', () => {
    beforeEach(() => {
      const mockPlayers = [
        { id: '1', name: 'Player1', is_gm: false, created_at: '2024-01-01' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockPlayers, error: null })
          ),
        })),
      } as any)
    })

    it('should be disabled when no player is selected', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /confirmar/i })
        expect(button).toBeDisabled()
      })
    })

    it('should be enabled when a player is selected', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(screen.getByText('Player1')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await userEvent.selectOptions(select, 'Player1')

      const button = screen.getByRole('button', { name: /confirmar/i })
      expect(button).not.toBeDisabled()
    })

    it('should call onPlayerSelect with selected player name when clicked', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(screen.getByText('Player1')).toBeInTheDocument()
      })

      const select = screen.getByRole('combobox')
      await userEvent.selectOptions(select, 'Player1')

      const button = screen.getByRole('button', { name: /confirmar/i })
      await userEvent.click(button)

      expect(mockOnPlayerSelect).toHaveBeenCalledWith('Player1')
      expect(mockOnPlayerSelect).toHaveBeenCalledTimes(1)
    })

    it('should not call onPlayerSelect if no player is selected', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /confirmar/i })
        expect(button).toBeDisabled()
      })

      const button = screen.getByRole('button', { name: /confirmar/i })
      // Button is disabled, so clicking won't work
      fireEvent.click(button)

      expect(mockOnPlayerSelect).not.toHaveBeenCalled()
    })
  })

  describe('CurrentUser Prop', () => {
    beforeEach(() => {
      const mockPlayers = [
        { id: '1', name: 'Player1', is_gm: false, created_at: '2024-01-01' },
        { id: '2', name: 'Player2', is_gm: true, created_at: '2024-01-02' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockPlayers, error: null })
          ),
        })),
      } as any)
    })

    it('should set initial selected player from currentUser prop', async () => {
      render(
        <PlayerSelectionModal
          onPlayerSelect={mockOnPlayerSelect}
          currentUser="Player2"
        />
      )

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement
        expect(select.value).toBe('Player2')
      })
    })

    it('should enable confirm button when currentUser is provided', async () => {
      render(
        <PlayerSelectionModal
          onPlayerSelect={mockOnPlayerSelect}
          currentUser="Player1"
        />
      )

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /confirmar/i })
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'DB Error' } })
          ),
        })),
      } as any)

      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error loading players:',
          expect.objectContaining({ message: 'DB Error' })
        )
      })

      // Should still render with empty list
      expect(screen.getByRole('combobox')).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })

    it('should handle null data from database', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      } as any)

      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        const select = screen.getByRole('combobox')
        expect(select).not.toBeDisabled()
      })

      // Should only have placeholder option
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(1)
      expect(options[0]).toHaveTextContent(/escolha um jogador/i)
    })
  })

  describe('Real-time Subscription', () => {
    beforeEach(() => {
      const mockPlayers = [
        { id: '1', name: 'Player1', is_gm: false, created_at: '2024-01-01' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockPlayers, error: null })
          ),
        })),
      } as any)
    })

    it('should set up real-time subscription on mount', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('players-changes')
      })

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        expect.any(Function)
      )

      expect(mockSubscribe).toHaveBeenCalled()
    })

    it('should clean up subscription on unmount', async () => {
      const { unmount } = render(
        <PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />
      )

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled()
      })

      unmount()

      expect(supabase.removeChannel).toHaveBeenCalled()
    })
  })

  describe('Language Switching', () => {
    beforeEach(() => {
      const mockPlayers = [
        { id: '1', name: 'Player1', is_gm: false, created_at: '2024-01-01' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockPlayers, error: null })
          ),
        })),
      } as any)
    })

    it('should switch to English when EN button is clicked', async () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      const enButton = screen.getByText('EN')
      await userEvent.click(enButton)

      await waitFor(() => {
        expect(screen.getByText(/who are you/i)).toBeInTheDocument()
      })
    })

    it('should display Portuguese by default', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      expect(screen.getByText(/quem é você/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      const mockPlayers = [
        { id: '1', name: 'Player1', is_gm: false, created_at: '2024-01-01' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockPlayers, error: null })
          ),
        })),
      } as any)
    })

    it('should have proper button roles', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      const button = screen.getByRole('button', { name: /confirmar/i })
      expect(button).toBeInTheDocument()
    })

    it('should have proper select role', () => {
      render(<PlayerSelectionModal onPlayerSelect={mockOnPlayerSelect} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })
  })
})
