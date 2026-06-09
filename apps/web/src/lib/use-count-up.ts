import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Layout effect on the client (so the reset-to-0 lands before paint, no flash),
// plain effect on the server (where useLayoutEffect would warn and do nothing).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Animates an integer from 0 up to `target` once, after mount.
 *
 * SSR-safe and flash-free: the initial render (server + hydration) shows the
 * final value, so there is no hydration mismatch; a layout effect then resets
 * to 0 before the first client paint and eases up via rAF. Honors
 * `prefers-reduced-motion` and the `enabled` flag by rendering the final value
 * instantly. The animated value is never the sole source of truth, so a
 * headless or motion-reduced render simply shows the real number.
 */
export function useCountUp(target: number, enabled = true, durationMs = 650): number {
  const [value, setValue] = useState(target)
  const frame = useRef<number | undefined>(undefined)

  useIsomorphicLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduce || target === 0) {
      setValue(target)
      return
    }

    setValue(0)
    let start: number | null = null
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

    const tick = (now: number) => {
      if (start === null) start = now
      const progress = Math.min((now - start) / durationMs, 1)
      setValue(Math.round(target * easeOutQuart(progress)))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target, enabled, durationMs])

  return value
}
