import '@testing-library/jest-dom'
import { expect, afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18n from '../i18n/config'

// Reset i18n before each test
beforeEach(() => {
  i18n.changeLanguage('pt-BR')
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.alert
global.alert = () => {}

