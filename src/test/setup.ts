import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './server'
import i18n from '../i18n/i18n'
import { LANGUAGE_STORAGE_KEY } from '../i18n/language'

// Browser layout/pointer APIs used by the accessible select are absent in jsdom.
HTMLElement.prototype.scrollIntoView = vi.fn()
HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
HTMLElement.prototype.releasePointerCapture = vi.fn()
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  window.localStorage.removeItem(LANGUAGE_STORAGE_KEY)
  await i18n.changeLanguage('en')
})
afterAll(() => server.close())
