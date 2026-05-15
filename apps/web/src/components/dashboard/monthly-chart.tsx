import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCents } from '~/lib/utils'
import type { MonthlySummary } from '@tracker/shared'

interface MonthlyChartProps {
  data: MonthlySummary[]
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString('en-US', { month: 'short' })
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  // Take the last 6 months of data
  const months = data.slice(-6)

  if (months.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available yet.</p>
        </CardContent>
      </Card>
    )
  }

  // Find the max value to scale bars proportionally
  const maxValue = Math.max(
    ...months.flatMap((m) => [m.income, m.expenses]),
    1 // avoid division by zero
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 sm:gap-6" style={{ height: '200px' }}>
          {months.map((month) => {
            const incomeHeight = (month.income / maxValue) * 100
            const expenseHeight = (month.expenses / maxValue) * 100

            return (
              <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
                {/* Bars container */}
                <div className="flex w-full items-end justify-center gap-1" style={{ height: '170px' }}>
                  {/* Income bar */}
                  <div className="group relative flex w-full max-w-[28px] flex-col items-center">
                    <div
                      className="w-full rounded-t bg-emerald-500 transition-all hover:bg-emerald-400"
                      style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                      title={`Income: ${formatCents(month.income)}`}
                    />
                  </div>
                  {/* Expense bar */}
                  <div className="group relative flex w-full max-w-[28px] flex-col items-center">
                    <div
                      className="w-full rounded-t bg-red-500 transition-all hover:bg-red-400"
                      style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                      title={`Expenses: ${formatCents(month.expenses)}`}
                    />
                  </div>
                </div>
                {/* Month label */}
                <span className="text-xs text-muted-foreground">
                  {formatMonthLabel(month.month)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-red-500" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
