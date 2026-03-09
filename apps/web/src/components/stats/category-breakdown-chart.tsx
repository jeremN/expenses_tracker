import { formatCents } from '~/lib/utils'

export type CategoryBreakdownRow = {
  category_id: number | null
  category_name: string | null
  category_color: string | null
  total: number
}

const DEFAULT_COLOR = '#94a3b8' // slate-400

export function CategoryBreakdownChart({ data }: { data: CategoryBreakdownRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No expense data for the selected month.
      </div>
    )
  }

  const grandTotal = data.reduce((sum, row) => sum + row.total, 0)
  const maxTotal = Math.max(...data.map((row) => row.total), 1)

  return (
    <div className="space-y-4">
      {/* Stacked bar overview */}
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
              title={`${row.category_name ?? 'Uncategorized'}: ${formatCents(row.total)}`}
            />
          )
        })}
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
                    {row.category_name ?? 'Uncategorized'}
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
                {formatCents(row.total)}
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
        <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
        <span className="text-sm font-semibold tabular-nums">
          {formatCents(grandTotal)}
        </span>
      </div>
    </div>
  )
}
