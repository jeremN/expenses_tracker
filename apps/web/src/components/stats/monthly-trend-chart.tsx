import { formatCents } from '~/lib/utils'

export type MonthlySummaryRow = {
  month: string
  income: number
  expenses: number
  balance: number
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
}

function getMonthLabel(month: string): string {
  // month is like "2026-03"
  const mm = month.split('-')[1] ?? ''
  return MONTH_LABELS[mm] ?? month
}

export function MonthlyTrendChart({ data }: { data: MonthlySummaryRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No data for the selected year.
      </div>
    )
  }

  // Find max value for scaling bars
  const maxValue = Math.max(
    ...data.flatMap((row) => [Math.abs(row.income), Math.abs(row.expenses)]),
    1,
  )

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span>Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span>Expenses</span>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {data.map((row) => {
          const incomePercent = (row.income / maxValue) * 100
          const expensePercent = (row.expenses / maxValue) * 100
          const net = row.balance

          return (
            <div key={row.month} className="grid grid-cols-[3rem_1fr_6rem] items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {getMonthLabel(row.month)}
              </span>

              <div className="space-y-1">
                {/* Income bar */}
                <div className="flex items-center gap-2">
                  <div className="h-4 w-full rounded-sm bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-emerald-500 transition-all"
                      style={{ width: `${incomePercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right tabular-nums">
                    ${formatCents(row.income)}
                  </span>
                </div>
                {/* Expense bar */}
                <div className="flex items-center gap-2">
                  <div className="h-4 w-full rounded-sm bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-red-500 transition-all"
                      style={{ width: `${expensePercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right tabular-nums">
                    ${formatCents(row.expenses)}
                  </span>
                </div>
              </div>

              <span
                className={`text-sm font-medium text-right tabular-nums ${
                  net >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {net >= 0 ? '+' : '-'}${formatCents(Math.abs(net))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
