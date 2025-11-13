import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeToggle from './ThemeToggle'
import '../../i18n/config'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset document attributes
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render all three theme buttons', () => {
      render(<ThemeToggle />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)

      // Check for emojis in buttons
      expect(screen.getByTitle(/claro/i)).toBeInTheDocument()
      expect(screen.getByTitle(/escuro/i)).toBeInTheDocument()
      expect(screen.getByTitle(/automático/i)).toBeInTheDocument()
    })

    it('should render light theme button with sun emoji', () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      expect(lightButton).toHaveTextContent('☀️')
    })

    it('should render dark theme button with moon emoji', () => {
      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      expect(darkButton).toHaveTextContent('🌙')
    })

    it('should render auto theme button with computer emoji', () => {
      render(<ThemeToggle />)

      const autoButton = screen.getByTitle(/auto/i)
      expect(autoButton).toHaveTextContent('💻')
    })
  })

  describe('Default Theme', () => {
    it('should default to auto theme when no localStorage value exists', () => {
      render(<ThemeToggle />)

      const autoButton = screen.getByTitle(/auto/i)
      expect(autoButton).toHaveClass('active')
    })

    it('should not set data-theme attribute on root element with auto theme', () => {
      render(<ThemeToggle />)

      expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    })

    it('should not have theme in localStorage when set to auto', () => {
      render(<ThemeToggle />)

      expect(localStorage.getItem('theme')).toBeNull()
    })
  })

  describe('Light Theme', () => {
    it('should switch to light theme when light button is clicked', async () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      await userEvent.click(lightButton)

      expect(lightButton).toHaveClass('active')
    })

    it('should set data-theme attribute to light on root element', async () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      await userEvent.click(lightButton)

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe(
          'light'
        )
      })
    })

    it('should save light theme to localStorage', async () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      await userEvent.click(lightButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light')
      })
    })

    it('should load light theme from localStorage on mount', () => {
      localStorage.setItem('theme', 'light')

      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      expect(lightButton).toHaveClass('active')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })
  })

  describe('Dark Theme', () => {
    it('should switch to dark theme when dark button is clicked', async () => {
      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      await userEvent.click(darkButton)

      expect(darkButton).toHaveClass('active')
    })

    it('should set data-theme attribute to dark on root element', async () => {
      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      await userEvent.click(darkButton)

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      })
    })

    it('should save dark theme to localStorage', async () => {
      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      await userEvent.click(darkButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark')
      })
    })

    it('should load dark theme from localStorage on mount', () => {
      localStorage.setItem('theme', 'dark')

      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      expect(darkButton).toHaveClass('active')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  describe('Auto Theme', () => {
    it('should switch back to auto theme when auto button is clicked', async () => {
      localStorage.setItem('theme', 'light')

      render(<ThemeToggle />)

      const autoButton = screen.getByTitle(/auto/i)
      await userEvent.click(autoButton)

      expect(autoButton).toHaveClass('active')
    })

    it('should remove data-theme attribute when switching to auto', async () => {
      localStorage.setItem('theme', 'light')

      render(<ThemeToggle />)

      const autoButton = screen.getByTitle(/auto/i)
      await userEvent.click(autoButton)

      await waitFor(() => {
        expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
      })
    })

    it('should remove theme from localStorage when switching to auto', async () => {
      localStorage.setItem('theme', 'light')

      render(<ThemeToggle />)

      const autoButton = screen.getByTitle(/auto/i)
      await userEvent.click(autoButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBeNull()
      })
    })
  })

  describe('Theme Switching', () => {
    it('should switch from light to dark', async () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      await userEvent.click(lightButton)

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe(
          'light'
        )
      })

      const darkButton = screen.getByTitle(/escuro/i)
      await userEvent.click(darkButton)

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      })
    })

    it('should switch from dark to auto', async () => {
      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      await userEvent.click(darkButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark')
      })

      const autoButton = screen.getByTitle(/automático/i)
      await userEvent.click(autoButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBeNull()
      })
    })

    it('should cycle through all themes', async () => {
      render(<ThemeToggle />)

      // Start with auto (default)
      expect(screen.getByTitle(/automático/i)).toHaveClass('active')

      // Click light
      await userEvent.click(screen.getByTitle(/claro/i))
      await waitFor(() => {
        expect(screen.getByTitle(/claro/i)).toHaveClass('active')
      })

      // Click dark
      await userEvent.click(screen.getByTitle(/escuro/i))
      await waitFor(() => {
        expect(screen.getByTitle(/escuro/i)).toHaveClass('active')
      })

      // Click auto
      await userEvent.click(screen.getByTitle(/automático/i))
      await waitFor(() => {
        expect(screen.getByTitle(/automático/i)).toHaveClass('active')
      })
    })
  })

  describe('Active Button Styling', () => {
    it('should only have active class on selected theme button', async () => {
      render(<ThemeToggle />)

      // Initially auto is active
      expect(screen.getByTitle(/automático/i)).toHaveClass('active')
      expect(screen.getByTitle(/claro/i)).not.toHaveClass('active')
      expect(screen.getByTitle(/escuro/i)).not.toHaveClass('active')

      // Click light
      await userEvent.click(screen.getByTitle(/claro/i))

      await waitFor(() => {
        expect(screen.getByTitle(/claro/i)).toHaveClass('active')
        expect(screen.getByTitle(/automático/i)).not.toHaveClass('active')
        expect(screen.getByTitle(/escuro/i)).not.toHaveClass('active')
      })
    })

    it('should update active class immediately on click', async () => {
      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      await userEvent.click(darkButton)

      expect(darkButton).toHaveClass('active')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on light button', () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      expect(lightButton).toHaveAttribute('aria-label')
      expect(lightButton.getAttribute('aria-label')).toMatch(/claro/i)
    })

    it('should have aria-label on dark button', () => {
      render(<ThemeToggle />)

      const darkButton = screen.getByTitle(/escuro/i)
      expect(darkButton).toHaveAttribute('aria-label')
      expect(darkButton.getAttribute('aria-label')).toMatch(/escuro/i)
    })

    it('should have aria-label on auto button', () => {
      render(<ThemeToggle />)

      const autoButton = screen.getByTitle(/automático/i)
      expect(autoButton).toHaveAttribute('aria-label')
      expect(autoButton.getAttribute('aria-label')).toMatch(/automático/i)
    })

    it('should have title attribute on all buttons', () => {
      render(<ThemeToggle />)

      expect(screen.getByTitle(/claro/i)).toBeInTheDocument()
      expect(screen.getByTitle(/escuro/i)).toBeInTheDocument()
      expect(screen.getByTitle(/automático/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle clicking the same theme button twice', async () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      await userEvent.click(lightButton)
      await userEvent.click(lightButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light')
        expect(lightButton).toHaveClass('active')
      })
    })

    it('should handle invalid theme value in localStorage', () => {
      localStorage.setItem('theme', 'invalid')

      render(<ThemeToggle />)

      // Should fall back to saved value but apply it anyway
      expect(document.documentElement.getAttribute('data-theme')).toBe(
        'invalid'
      )
    })

    it('should handle rapid theme changes', async () => {
      render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      const darkButton = screen.getByTitle(/escuro/i)
      const autoButton = screen.getByTitle(/automático/i)

      // Rapidly click different themes
      fireEvent.click(lightButton)
      fireEvent.click(darkButton)
      fireEvent.click(autoButton)
      fireEvent.click(lightButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light')
      })
    })
  })

  describe('Persistence', () => {
    it('should persist theme across component remounts', async () => {
      const { unmount } = render(<ThemeToggle />)

      const lightButton = screen.getByTitle(/claro/i)
      await userEvent.click(lightButton)

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light')
      })

      unmount()

      // Remount
      render(<ThemeToggle />)

      expect(screen.getByTitle(/claro/i)).toHaveClass('active')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })
  })
})

