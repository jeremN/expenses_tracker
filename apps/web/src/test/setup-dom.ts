// Runs before every test file (node + jsdom). The jest-dom matchers and
// cleanup are harmless under node; the matchMedia shim only takes effect when
// a jsdom `window` exists.
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => cleanup())

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
