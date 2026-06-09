import { useRef, useState } from 'react'
import type { InvestmentSnapshot } from '@tracker/shared'
import { ChartTooltip } from '~/components/ui/chart-tooltip'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'

interface GrowthChartProps {
  snapshots: InvestmentSnapshot[]
}

export function GrowthChart({ snapshots }: GrowthChartProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  // Hooks must precede the early return below (Rules of Hooks): when the
  // snapshot count crosses the <2 boundary on a re-render, hook count must
  // stay constant or React throws.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null)

  if (snapshots.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          {t('investments.chart.notEnough.title')}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('investments.chart.notEnough.subtitle')}
        </p>
      </div>
    )
  }

  // Sort by date ascending for charting
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const values = sorted.map((s) => s.totalValue)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1

  // Chart dimensions
  const chartWidth = 800
  const chartHeight = 300
  const paddingX = 60
  const paddingY = 30
  const innerWidth = chartWidth - paddingX * 2
  const innerHeight = chartHeight - paddingY * 2

  // Build points
  const points = sorted.map((s, i) => {
    const x = paddingX + (i / (sorted.length - 1)) * innerWidth
    const y =
      paddingY +
      innerHeight -
      ((s.totalValue - minValue) / valueRange) * innerHeight
    return { x, y, snapshot: s }
  })

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const wrap = wrapRef.current
    if (!wrap) return
    const svgRect = e.currentTarget.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    // Map the cursor's client x into the SVG's viewBox coordinate space.
    const svgX = ((e.clientX - svgRect.left) / svgRect.width) * chartWidth
    let nearest = 0
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - svgX) < Math.abs(points[nearest].x - svgX)) nearest = i
    }
    // Anchor to the wrapper (the positioned ancestor): convert the nearest
    // point's viewBox coords to client px, then to wrapper-local px so the
    // wrapper's padding never offsets the tooltip.
    const px = svgRect.left + (points[nearest].x / chartWidth) * svgRect.width - wrapRect.left
    const py = svgRect.top + (points[nearest].y / chartHeight) * svgRect.height - wrapRect.top
    setHover({ i: nearest, px, py })
  }

  // SVG path for the line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Area path (fill below line)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingY + innerHeight} L ${points[0].x} ${paddingY + innerHeight} Z`

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * i) / 4
    const y = paddingY + innerHeight - (i / 4) * innerHeight
    return { value, y }
  })

  // X-axis labels — show a subset of dates
  const maxLabels = Math.min(sorted.length, 6)
  const step = Math.max(1, Math.floor((sorted.length - 1) / (maxLabels - 1)))
  const xLabels: { label: string; x: number }[] = []
  for (let i = 0; i < sorted.length; i += step) {
    xLabels.push({
      label: formatDate(sorted[i].date),
      x: points[i].x,
    })
  }
  // Always include last point
  if (xLabels.length > 0 && xLabels[xLabels.length - 1].x !== points[points.length - 1].x) {
    xLabels.push({
      label: formatDate(sorted[sorted.length - 1].date),
      x: points[points.length - 1].x,
    })
  }

  return (
    <div ref={wrapRef} className="relative w-full rounded-lg border bg-card p-4">
      {/* Scroll lives on an inner element so the tooltip (a child of the
          non-overflow wrapper) is never clipped at the top edge. */}
      <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick.value}
            x1={paddingX}
            y1={tick.y}
            x2={chartWidth - paddingX}
            y2={tick.y}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={tick.value}
            x={paddingX - 8}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize="11"
          >
            {formatCompact(tick.value)}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label) => (
          <text
            key={label.label + label.x}
            x={label.x}
            y={chartHeight - 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="11"
          >
            {label.label}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="currentColor" className="text-investment/10" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          className="text-investment"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover crosshair */}
        {hover && (
          <line
            x1={points[hover.i].x}
            y1={paddingY}
            x2={points[hover.i].x}
            y2={paddingY + innerHeight}
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeDasharray="3 3"
            className="text-muted-foreground"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={p.snapshot.id}
            cx={p.x}
            cy={p.y}
            r={hover?.i === i ? 6 : 4}
            fill="currentColor"
            className="text-investment transition-[r] duration-150 ease-out"
          />
        ))}
      </svg>
      </div>
      {hover && (
        <ChartTooltip visible x={hover.px} y={hover.py}>
          <span className="font-medium">{formatDate(sorted[hover.i].date)}</span>
          {' · '}
          <span className="font-mono tabular-nums">{formatMoney(sorted[hover.i].totalValue)}</span>
        </ChartTooltip>
      )}
    </div>
  )
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}`
}

function formatCompact(cents: number) {
  const value = cents / 100
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toFixed(0)
}
