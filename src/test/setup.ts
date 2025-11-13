import '@testing-library/jest-dom'
import { expect, afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18n from '../i18n/config'

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
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock window.matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Reset i18n before each test
beforeEach(() => {
  i18n.changeLanguage('pt-BR')
  localStorage.clear()
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  localStorage.clear()
})

// Mock window.alert
global.alert = vi.fn()

// Suppress console errors in tests (can be overridden per test)
const originalConsoleError = console.error
beforeEach(() => {
  console.error = (...args: any[]) => {
    // Only log errors that aren't React testing warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') ||
        args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
})

afterEach(() => {
  console.error = originalConsoleError
})

