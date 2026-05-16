import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'

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
  const { t } = useTranslation()
  const pct = percentChange(current, previous)
  if (pct === null) return null

  const value = parseFloat(pct)
  const isPositive = value > 0
  const isZero = value === 0

  if (isZero) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        {t('dashboard.trend.flat')}
      </span>
    )
  }

  // For expenses, positive change is bad (red), negative is good (green)
  // For income/balance, positive is good (green), negative is bad (red)
  const isGood = invertColor ? !isPositive : isPositive

  return (
    <span className={`flex items-center gap-1 text-xs ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {t('dashboard.trend.vsLastMonth', { value: `${isPositive ? '+' : ''}${pct}` })}
    </span>
  )
}

export function SummaryCards({ currentMonth, previousMonth }: SummaryCardsProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Income Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.income')}</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            +{formatMoney(currentMonth.income)}
          </div>
          <TrendIndicator current={currentMonth.income} previous={previousMonth.income} />
        </CardContent>
      </Card>

      {/* Expenses Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.expenses')}</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            -{formatMoney(currentMonth.expenses)}
          </div>
          <TrendIndicator current={currentMonth.expenses} previous={previousMonth.expenses} invertColor />
        </CardContent>
      </Card>

      {/* Balance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.balance')}</CardTitle>
          <Minus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${currentMonth.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {currentMonth.balance >= 0 ? '+' : '-'}{formatMoney(Math.abs(currentMonth.balance))}
          </div>
          <TrendIndicator current={currentMonth.balance} previous={previousMonth.balance} />
        </CardContent>
      </Card>
    </div>
  )
}
