import { ArrowUpRight, ArrowDownRight, Wallet, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '~/components/ui/card'
import { Amount, type AmountTone } from '~/components/ui/amount'
import { useTranslation } from '~/i18n'
import { cn } from '~/lib/utils'

interface MonthData {
  income: number
  expenses: number
  balance: number
}

interface SummaryCardsProps {
  currentMonth: MonthData
  previousMonth: MonthData
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/** Calm trend chip: direction arrow + signed percentage + tinted color. */
function TrendChip({
  current,
  previous,
  invertColor,
}: {
  current: number
  previous: number
  invertColor?: boolean
}) {
  const { t } = useTranslation()
  const pct = percentChange(current, previous)

  if (pct === null || Math.abs(pct) < 0.05) {
    return (
      <span className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        {t('dashboard.trend.flat')}
      </span>
    )
  }

  const isUp = pct > 0
  // Up income/balance is good; up expense is bad. Color follows good/bad, not direction.
  const isGood = invertColor ? !isUp : isUp
  const formatted = `${isUp ? '+' : '−'}${Math.abs(pct).toFixed(1)}`

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
        isGood ? 'bg-income-subtle text-income' : 'bg-expense-subtle text-expense',
      )}
    >
      {isUp ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {t('dashboard.trend.vsLastMonth', { value: formatted })}
    </span>
  )
}

function StatCard({
  label,
  icon: Icon,
  iconClass,
  cents,
  tone,
  children,
}: {
  label: string
  icon: LucideIcon
  iconClass: string
  cents: number
  tone: AmountTone
  children: React.ReactNode
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full',
            iconClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <Amount cents={cents} tone={tone} className="text-3xl font-semibold leading-none" />
      {children}
    </Card>
  )
}

export function SummaryCards({ currentMonth, previousMonth }: SummaryCardsProps) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label={t('dashboard.income')}
        icon={ArrowUpRight}
        iconClass="bg-income-subtle text-income"
        cents={currentMonth.income}
        tone="income"
      >
        <TrendChip current={currentMonth.income} previous={previousMonth.income} />
      </StatCard>

      <StatCard
        label={t('dashboard.expenses')}
        icon={ArrowDownRight}
        iconClass="bg-expense-subtle text-expense"
        cents={currentMonth.expenses}
        tone="expense"
      >
        <TrendChip
          current={currentMonth.expenses}
          previous={previousMonth.expenses}
          invertColor
        />
      </StatCard>

      <StatCard
        label={t('dashboard.balance')}
        icon={Wallet}
        iconClass="bg-secondary text-foreground"
        cents={currentMonth.balance}
        tone="signed"
      >
        <TrendChip current={currentMonth.balance} previous={previousMonth.balance} />
      </StatCard>
    </div>
  )
}
