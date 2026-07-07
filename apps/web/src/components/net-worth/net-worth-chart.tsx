import { useRef, useState } from 'react'
import type { NetWorthSnapshot } from '@tracker/shared'
import { ChartTooltip } from '~/components/ui/chart-tooltip'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'

interface NetWorthChartProps {
  snapshots: NetWorthSnapshot[]
}

/**
 * Net-worth trend line — structurally the sibling of investments' GrowthChart,
 * plotting `netWorth` (which can be negative, so the baseline is the data min,
 * not zero). Reuses ChartTooltip and the same hover/crosshair interaction.
 */
export function NetWorthChart({ snapshots }: NetWorthChartProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  // Hooks precede the early return (Rules of Hooks) so the hook count is stable
  // when the snapshot count crosses the <2 boundary on a re-render.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null)

  if (snapshots.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          {t('netWorth.chart.notEnough.title')}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('netWorth.chart.notEnough.subtitle')}
        </p>
      </div>
    )
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const values = sorted.map((s) => s.netWorth)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1

  const chartWidth = 800
  const chartHeight = 300
  const paddingX = 60
  const paddingY = 30
  const innerWidth = chartWidth - paddingX * 2
  const innerHeight = chartHeight - paddingY * 2

  const points = sorted.map((s, i) => {
    const x = paddingX + (i / (sorted.length - 1)) * innerWidth
    const y = paddingY + innerHeight - ((s.netWorth - minValue) / valueRange) * innerHeight
    return { x, y, snapshot: s }
  })

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const wrap = wrapRef.current
    if (!wrap) return
    const svgRect = e.currentTarget.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    const svgX = ((e.clientX - svgRect.left) / svgRect.width) * chartWidth
    let nearest = 0
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - svgX) < Math.abs(points[nearest].x - svgX)) nearest = i
    }
    const px = svgRect.left + (points[nearest].x / chartWidth) * svgRect.width - wrapRect.left
    const py = svgRect.top + (points[nearest].y / chartHeight) * svgRect.height - wrapRect.top
    setHover({ i: nearest, px, py })
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingY + innerHeight} L ${points[0].x} ${paddingY + innerHeight} Z`

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * i) / 4
    const y = paddingY + innerHeight - (i / 4) * innerHeight
    return { value, y }
  })

  const maxLabels = Math.min(sorted.length, 6)
  const step = Math.max(1, Math.floor((sorted.length - 1) / (maxLabels - 1)))
  const xLabels: { label: string; x: number }[] = []
  for (let i = 0; i < sorted.length; i += step) {
    xLabels.push({ label: formatShort(sorted[i].date), x: points[i].x })
  }
  if (xLabels.length > 0 && xLabels[xLabels.length - 1].x !== points[points.length - 1].x) {
    xLabels.push({ label: formatShort(sorted[sorted.length - 1].date), x: points[points.length - 1].x })
  }

  return (
    <div ref={wrapRef} className="relative w-full rounded-lg border bg-card p-4">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
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

          <path d={areaPath} fill="currentColor" className="text-primary/10" />

          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

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

          {points.map((p, i) => (
            <circle
              key={p.snapshot.id}
              cx={p.x}
              cy={p.y}
              r={hover?.i === i ? 6 : 4}
              fill="currentColor"
              className="text-primary transition-[r] duration-150 ease-out"
            />
          ))}
        </svg>
      </div>
      {hover && (
        <ChartTooltip visible x={hover.px} y={hover.py}>
          <span className="font-medium">{formatShort(sorted[hover.i].date)}</span>
          {' · '}
          <span className="font-mono tabular-nums">{formatMoney(sorted[hover.i].netWorth)}</span>
        </ChartTooltip>
      )}
    </div>
  )
}

function formatShort(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${month}/${day}`
}

function formatCompact(cents: number) {
  const value = cents / 100
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`
  return value.toFixed(0)
}
