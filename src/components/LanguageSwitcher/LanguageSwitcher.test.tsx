import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LanguageSwitcher from './LanguageSwitcher'
import '../../i18n/config'
import i18n from '../../i18n/config'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    // Reset to default language before each test
    i18n.changeLanguage('pt-BR')
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render EN and PT buttons', () => {
      render(<LanguageSwitcher />)

      expect(screen.getByText('EN')).toBeInTheDocument()
      expect(screen.getByText('PT')).toBeInTheDocument()
    })

    it('should render both buttons as button elements', () => {
      render(<LanguageSwitcher />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('should have language-switcher class on container', () => {
      const { container } = render(<LanguageSwitcher />)

      const switcher = container.querySelector('.language-switcher')
      expect(switcher).toBeInTheDocument()
    })
  })

  describe('Default Language', () => {
    it('should default to Portuguese (pt-BR)', () => {
      render(<LanguageSwitcher />)

      const ptButton = screen.getByText('PT')
      expect(ptButton).toHaveClass('active')
    })

    it('should not have active class on EN button by default', () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      expect(enButton).not.toHaveClass('active')
    })

    it('should have lang-button class on both buttons', () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      const ptButton = screen.getByText('PT')

      expect(enButton).toHaveClass('lang-button')
      expect(ptButton).toHaveClass('lang-button')
    })
  })

  describe('Language Switching to English', () => {
    it('should switch to English when EN button is clicked', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      await userEvent.click(enButton)

      await waitFor(() => {
        expect(i18n.language).toBe('en')
      })
    })

    it('should add active class to EN button after clicking', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      await userEvent.click(enButton)

      await waitFor(() => {
        expect(enButton).toHaveClass('active')
      })
    })

    it('should remove active class from PT button when switching to EN', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      const ptButton = screen.getByText('PT')

      await userEvent.click(enButton)

      await waitFor(() => {
        expect(ptButton).not.toHaveClass('active')
      })
    })
  })

  describe('Language Switching to Portuguese', () => {
    it('should switch to Portuguese when PT button is clicked', async () => {
      // First switch to English
      i18n.changeLanguage('en')

      render(<LanguageSwitcher />)

      const ptButton = screen.getByText('PT')
      await userEvent.click(ptButton)

      await waitFor(() => {
        expect(i18n.language).toBe('pt-BR')
      })
    })

    it('should add active class to PT button after clicking', async () => {
      // First switch to English
      i18n.changeLanguage('en')

      render(<LanguageSwitcher />)

      const ptButton = screen.getByText('PT')
      await userEvent.click(ptButton)

      await waitFor(() => {
        expect(ptButton).toHaveClass('active')
      })
    })

    it('should remove active class from EN button when switching to PT', async () => {
      // First switch to English
      i18n.changeLanguage('en')

      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      const ptButton = screen.getByText('PT')

      await userEvent.click(ptButton)

      await waitFor(() => {
        expect(enButton).not.toHaveClass('active')
      })
    })
  })

  describe('Active Button Styling', () => {
    it('should only have one active button at a time', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      const ptButton = screen.getByText('PT')

      // Initially PT is active
      expect(ptButton).toHaveClass('active')
      expect(enButton).not.toHaveClass('active')

      // Click EN
      await userEvent.click(enButton)

      await waitFor(() => {
        expect(enButton).toHaveClass('active')
        expect(ptButton).not.toHaveClass('active')
      })
    })

    it('should update active class immediately when switching', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')

      await userEvent.click(enButton)

      await waitFor(() => {
        expect(enButton).toHaveClass('active')
      })
    })
  })

  describe('Multiple Language Switches', () => {
    it('should handle switching back and forth between languages', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      const ptButton = screen.getByText('PT')

      // Switch to EN
      await userEvent.click(enButton)
      await waitFor(() => {
        expect(i18n.language).toBe('en')
      })

      // Switch back to PT
      await userEvent.click(ptButton)
      await waitFor(() => {
        expect(i18n.language).toBe('pt-BR')
      })

      // Switch to EN again
      await userEvent.click(enButton)
      await waitFor(() => {
        expect(i18n.language).toBe('en')
      })
    })

    it('should maintain correct active state through multiple switches', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      const ptButton = screen.getByText('PT')

      await userEvent.click(enButton)
      await waitFor(() => {
        expect(enButton).toHaveClass('active')
      })

      await userEvent.click(ptButton)
      await waitFor(() => {
        expect(ptButton).toHaveClass('active')
      })

      await userEvent.click(enButton)
      await waitFor(() => {
        expect(enButton).toHaveClass('active')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have button role for both buttons', () => {
      render(<LanguageSwitcher />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('should be keyboard accessible', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')

      // Tab to the button
      enButton.focus()
      expect(enButton).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should handle clicking the same language button twice', async () => {
      render(<LanguageSwitcher />)

      const ptButton = screen.getByText('PT')

      // Click PT twice (already selected)
      await userEvent.click(ptButton)
      await userEvent.click(ptButton)

      // Should remain PT
      expect(i18n.language).toBe('pt-BR')
      expect(ptButton).toHaveClass('active')
    })

    it('should handle rapid button clicks', async () => {
      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      const ptButton = screen.getByText('PT')

      // Rapid clicks
      await userEvent.click(enButton)
      await userEvent.click(ptButton)
      await userEvent.click(enButton)
      await userEvent.click(ptButton)

      await waitFor(() => {
        expect(i18n.language).toBe('pt-BR')
        expect(ptButton).toHaveClass('active')
      })
    })
  })

  describe('Integration with i18n', () => {
    it('should call i18n.changeLanguage with correct language code for EN', async () => {
      const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage')

      render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      await userEvent.click(enButton)

      expect(changeLanguageSpy).toHaveBeenCalledWith('en')

      changeLanguageSpy.mockRestore()
    })

    it('should call i18n.changeLanguage with correct language code for PT', async () => {
      i18n.changeLanguage('en')
      const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage')

      render(<LanguageSwitcher />)

      const ptButton = screen.getByText('PT')
      await userEvent.click(ptButton)

      expect(changeLanguageSpy).toHaveBeenCalledWith('pt-BR')

      changeLanguageSpy.mockRestore()
    })
  })

  describe('Component State Persistence', () => {
    it('should reflect current language when component remounts', async () => {
      // Set language to EN
      i18n.changeLanguage('en')

      const { unmount } = render(<LanguageSwitcher />)

      const enButton = screen.getByText('EN')
      expect(enButton).toHaveClass('active')

      unmount()

      // Remount with same language
      render(<LanguageSwitcher />)

      const enButton2 = screen.getByText('EN')
      expect(enButton2).toHaveClass('active')
    })
  })
})

