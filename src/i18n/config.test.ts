import { describe, expect, it, beforeEach } from 'vitest'
import i18n from './config'

describe('i18n Configuration', () => {
  beforeEach(() => {
    // Reset to default language
    i18n.changeLanguage('pt-BR')
  })

  describe('Initialization', () => {
    it('should initialize with pt-BR as default language', () => {
      expect(i18n.language).toBe('pt-BR')
    })

    it('should have pt-BR as fallback language', () => {
      expect(i18n.options.fallbackLng).toContain('pt-BR')
    })

    it('should have escape value disabled for React', () => {
      expect(i18n.options.interpolation?.escapeValue).toBe(false)
    })
  })

  describe('Available Languages', () => {
    it('should have English translations loaded', () => {
      expect(i18n.hasResourceBundle('en', 'translation')).toBe(true)
    })

    it('should have Portuguese (Brazil) translations loaded', () => {
      expect(i18n.hasResourceBundle('pt-BR', 'translation')).toBe(true)
    })
  })

  describe('Language Switching', () => {
    it('should switch to English', async () => {
      await i18n.changeLanguage('en')
      expect(i18n.language).toBe('en')
    })

    it('should switch back to Portuguese', async () => {
      await i18n.changeLanguage('en')
      await i18n.changeLanguage('pt-BR')
      expect(i18n.language).toBe('pt-BR')
    })
  })

  describe('Translation Keys - Portuguese', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('pt-BR')
    })

    it('should have app title translation', () => {
      const title = i18n.t('app.title')
      expect(title).toBe('Agendador de Sessões de RPG')
    })

    it('should have session label translation', () => {
      const label = i18n.t('session.label')
      expect(label).toBeTruthy()
      expect(label).not.toBe('session.label')
    })

    it('should have player label translation', () => {
      const label = i18n.t('player.label')
      expect(label).toBeTruthy()
      expect(label).not.toBe('player.label')
    })

    it('should have days of week translations', () => {
      const sunday = i18n.t('days.sunday')
      const monday = i18n.t('days.monday')

      expect(sunday).toBe('Domingo')
      expect(monday).toBe('Segunda')
    })

    it('should have theme translations', () => {
      const light = i18n.t('theme.light')
      const dark = i18n.t('theme.dark')
      const auto = i18n.t('theme.auto')

      expect(light).toBeTruthy()
      expect(dark).toBeTruthy()
      expect(auto).toBeTruthy()
    })
  })

  describe('Translation Keys - English', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en')
    })

    it('should have app title translation in English', () => {
      const title = i18n.t('app.title')
      expect(title).toBe('TTRPG Session Planner')
    })

    it('should have session label translation in English', () => {
      const label = i18n.t('session.label')
      expect(label).toBeTruthy()
      expect(label).not.toBe('session.label')
    })

    it('should have days of week translations in English', () => {
      const sunday = i18n.t('days.sunday')
      const monday = i18n.t('days.monday')

      expect(sunday).toBe('Sunday')
      expect(monday).toBe('Monday')
    })
  })

  describe('Missing Keys', () => {
    it('should return key itself when translation is missing', () => {
      const missingKey = i18n.t('non.existent.key')
      expect(missingKey).toBe('non.existent.key')
    })

    it('should use fallback language for missing translations', async () => {
      // Even if we're in EN, if a key is missing, it should fall back to pt-BR
      await i18n.changeLanguage('en')
      const result = i18n.t('some.missing.key')
      expect(result).toBeTruthy()
    })
  })

  describe('Interpolation', () => {
    it('should support variable interpolation', async () => {
      await i18n.changeLanguage('pt-BR')
      const result = i18n.t('save.savingIn', { seconds: 5 })
      expect(result).toContain('5')
    })

    it('should handle interpolation in English', async () => {
      await i18n.changeLanguage('en')
      const result = i18n.t('save.savingIn', { seconds: 3 })
      expect(result).toContain('3')
    })
  })

  describe('Namespace', () => {
    it('should use default translation namespace', () => {
      expect(i18n.options.defaultNS).toBeTruthy() // Uses 'translation' namespace
      expect(i18n.hasResourceBundle('pt-BR', 'translation')).toBe(true)
    })
  })

  describe('Configuration Options', () => {
    it('should have react-i18next initialized', () => {
      expect(i18n.use).toBeDefined()
      expect(i18n.init).toBeDefined()
    })

    it('should have resources configured', () => {
      expect(i18n.options.resources).toBeDefined()
      expect(i18n.options.resources?.en).toBeDefined()
      expect(i18n.options.resources?.['pt-BR']).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid language changes', async () => {
      await i18n.changeLanguage('en')
      await i18n.changeLanguage('pt-BR')
      await i18n.changeLanguage('en')
      await i18n.changeLanguage('pt-BR')

      expect(i18n.language).toBe('pt-BR')
    })

    it('should handle invalid language codes gracefully', async () => {
      // Trying to change to an unsupported language
      await i18n.changeLanguage('fr')
      // Should either stay on current or use fallback
      expect(i18n.language).toBeTruthy()
    })
  })
})
