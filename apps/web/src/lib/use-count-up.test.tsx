// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from './use-count-up'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useCountUp', () => {
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

  it('animates from 0 up to the target over the duration when enabled', () => {
    // Drive requestAnimationFrame manually so the run is deterministic, not
    // wall-clock dependent. The shim's matchMedia returns no-reduced-motion.
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const { result } = renderHook(() => useCountUp(1000, true, 650))
    // Layout effect resets to 0 and schedules the first frame.
    expect(result.current).toBe(0)

    act(() => frames[frames.length - 1](0)) // first frame: start timestamp, progress 0
    expect(result.current).toBe(0)

    act(() => frames[frames.length - 1](650)) // final frame: progress 1 → exact target
    expect(result.current).toBe(1000)
  })
})
