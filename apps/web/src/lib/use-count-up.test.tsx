// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCountUp } from './use-count-up'

afterEach(() => vi.restoreAllMocks())

describe('useCountUp (SSR-safe contract)', () => {
  it('returns the target immediately when disabled', () => {
    const { result } = renderHook(() => useCountUp(500, false))
    expect(result.current).toBe(500)
  })

  it('returns 0 immediately when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0, true))
    expect(result.current).toBe(0)
  })

  it('returns the target immediately when reduced motion is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)
    const { result } = renderHook(() => useCountUp(500, true))
    expect(result.current).toBe(500)
  })
})
