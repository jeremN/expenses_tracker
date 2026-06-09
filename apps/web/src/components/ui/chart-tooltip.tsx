import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

interface ChartTooltipProps {
  /** Pixel offset within the chart's `relative` container. */
  x: number
  y: number
  visible: boolean
  children: ReactNode
  className?: string
}

/**
 * Floating tooltip for charts. Position is relative to the nearest positioned
 * ancestor — wrap the chart in a `relative` container. Pointer-events are off
 * so it never steals hover from the chart. Returns null when hidden.
 */
export function ChartTooltip({ x, y, visible, children, className }: ChartTooltipProps) {
  if (!visible) return null
  return (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+8px)]',
        'whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-soft',
        'motion-safe:transition-[left,top] motion-safe:duration-75',
        className,
      )}
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {children}
    </div>
  )
}
