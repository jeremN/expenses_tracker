import { useRef, useState } from 'react'
import { ChartTooltip } from '~/components/ui/chart-tooltip'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'

export type CategoryBreakdownRow = {
  category_id: number | null
  category_name: string | null
  category_color: string | null
  total: number
}

const DEFAULT_COLOR = '#94a3b8' // slate-400

export function CategoryBreakdownChart({ data }: { data: CategoryBreakdownRow[] }) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  // Hooks must precede the early return below (Rules of Hooks).
  const barRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('stats.category.noData')}
      </div>
    )
  }

  const grandTotal = data.reduce((sum, row) => sum + row.total, 0)
  const maxTotal = Math.max(...data.map((row) => row.total), 1)

  function show(e: React.MouseEvent<HTMLDivElement>, label: string) {
    const bar = barRef.current
    if (!bar) return
    const barRect = bar.getBoundingClientRect()
    const r = e.currentTarget.getBoundingClientRect()
    setHover({ x: r.left - barRect.left + r.width / 2, y: r.top - barRect.top, label })
  }

  return (
    <div className="space-y-4">
      {/* Stacked bar overview */}
      <div ref={barRef} className="relative">
        <div className="h-6 w-full rounded-full overflow-hidden flex">
          {data.map((row) => {
            const percent = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0
            return (
              <div
                key={row.category_id ?? 'uncategorized'}
                className="h-full transition-all"
                style={{
                  width: `${percent}%`,
                  backgroundColor: row.category_color || DEFAULT_COLOR,
                  minWidth: percent > 0 ? '2px' : '0',
                }}
                onMouseEnter={(e) =>
                  show(e, `${row.category_name ?? t('stats.uncategorized')}: ${formatMoney(row.total)}`)
                }
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </div>
        {hover && (
          <ChartTooltip visible x={hover.x} y={hover.y}>
            {hover.label}
          </ChartTooltip>
        )}
      </div>

      {/* Category rows */}
      <div className="space-y-3">
        {data.map((row) => {
          const percent = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0
          const barPercent = (row.total / maxTotal) * 100

          return (
            <div
              key={row.category_id ?? 'uncategorized'}
              className="grid grid-cols-[1fr_5rem_3.5rem] items-center gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: row.category_color || DEFAULT_COLOR }}
                  />
                  <span className="text-sm font-medium truncate">
                    {row.category_name ?? t('stats.uncategorized')}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barPercent}%`,
                      backgroundColor: row.category_color || DEFAULT_COLOR,
                    }}
                  />
                </div>
              </div>

              <span className="text-sm font-medium text-right tabular-nums">
                {formatMoney(row.total)}
              </span>

              <span className="text-xs text-muted-foreground text-right tabular-nums">
                {percent.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm font-medium text-muted-foreground">{t('stats.totalExpenses')}</span>
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(grandTotal)}
        </span>
      </div>
    </div>
  )
}
