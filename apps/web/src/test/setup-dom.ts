// Runs before every test file (node + jsdom). The jest-dom matchers are
// harmless under node; the DOM cleanup hook and matchMedia shim only apply
// when a jsdom `window` exists, so node (server) tests stay untouched.
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

if (typeof window !== 'undefined') {
  // Unmount React trees between component tests (jsdom only).
  afterEach(() => cleanup())
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  // jsdom does not implement matchMedia; default to "no preference".
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList
}
