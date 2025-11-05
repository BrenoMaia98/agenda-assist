import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './ThemeToggle.css'

type Theme = 'light' | 'dark' | 'auto'

export default function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    return savedTheme || 'auto'
  })

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'auto') {
      root.removeAttribute('data-theme')
      localStorage.removeItem('theme')
    } else {
      root.setAttribute('data-theme', theme)
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  return (
    <div className="theme-toggle">
      <button
        className={`theme-button ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title={t('theme.light')}
        aria-label={t('theme.light')}
      >
        ☀️
      </button>
      <button
        className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title={t('theme.dark')}
        aria-label={t('theme.dark')}
      >
        🌙
      </button>
      <button
        className={`theme-button ${theme === 'auto' ? 'active' : ''}`}
        onClick={() => setTheme('auto')}
        title={t('theme.auto')}
        aria-label={t('theme.auto')}
      >
        💻
      </button>
    </div>
  )
}

