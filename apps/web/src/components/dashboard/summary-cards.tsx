import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCents } from '~/lib/utils'

interface MonthData {
  income: number
  expenses: number
  balance: number
}

interface SummaryCardsProps {
  currentMonth: MonthData
  previousMonth: MonthData
}

function percentChange(current: number, previous: number): string | null {
  if (previous === 0) return null
  const change = ((current - previous) / previous) * 100
  return change.toFixed(1)
}

function TrendIndicator({ current, previous, invertColor }: { current: number; previous: number; invertColor?: boolean }) {
  const pct = percentChange(current, previous)
  if (pct === null) return null

  const value = parseFloat(pct)
  const isPositive = value > 0
  const isZero = value === 0

  if (isZero) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        0.0% vs last month
      </span>
    )
  }

  // For expenses, positive change is bad (red), negative is good (green)
  // For income/balance, positive is good (green), negative is bad (red)
  const isGood = invertColor ? !isPositive : isPositive

  return (
    <span className={`flex items-center gap-1 text-xs ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{pct}% vs last month
    </span>
  )
}

export function SummaryCards({ currentMonth, previousMonth }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Income Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            +${formatCents(currentMonth.income)}
          </div>
          <TrendIndicator current={currentMonth.income} previous={previousMonth.income} />
        </CardContent>
      </Card>

      {/* Expenses Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            -${formatCents(currentMonth.expenses)}
          </div>
          <TrendIndicator current={currentMonth.expenses} previous={previousMonth.expenses} invertColor />
        </CardContent>
      </Card>

      {/* Balance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance</CardTitle>
          <Minus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${currentMonth.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {currentMonth.balance >= 0 ? '+' : '-'}${formatCents(Math.abs(currentMonth.balance))}
          </div>
          <TrendIndicator current={currentMonth.balance} previous={previousMonth.balance} />
        </CardContent>
      </Card>
    </div>
  )
}
