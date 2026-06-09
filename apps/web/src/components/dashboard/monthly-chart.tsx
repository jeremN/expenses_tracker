import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'
import type { MonthlySummary } from '@tracker/shared'

interface MonthlyChartProps {
  data: MonthlySummary[]
}

const LOCALE_TAGS = { en: 'en-US', fr: 'fr-FR' } as const

function formatMonthLabel(month: string, locale: 'en' | 'fr'): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString(LOCALE_TAGS[locale], { month: 'short' })
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-[3px] ${className}`} />
      {label}
    </span>
  )
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const { t, locale } = useTranslation()
  const { formatMoney } = useFormat()
  const months = data.slice(-6)

  if (months.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.monthlyOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('dashboard.noDataYet')}</p>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...months.flatMap((m) => [m.income, m.expenses]), 1)

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">{t('dashboard.monthlyOverview')}</CardTitle>
        <div className="flex items-center gap-3">
          <Swatch className="bg-income" label={t('dashboard.income')} />
          <Swatch className="bg-expense" label={t('dashboard.expenses')} />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex h-[200px] items-end gap-2 border-b border-border sm:gap-4">
          {months.map((month) => {
            const incomeHeight = Math.max((month.income / maxValue) * 100, month.income > 0 ? 1.5 : 0)
            const expenseHeight = Math.max((month.expenses / maxValue) * 100, month.expenses > 0 ? 1.5 : 0)

            return (
              <div key={month.month} className="group flex h-full flex-1 items-end justify-center gap-1">
                <div
                  className="w-full max-w-[22px] rounded-t-sm bg-income opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ height: `${incomeHeight}%` }}
                  title={`${t('dashboard.income')}: ${formatMoney(month.income)}`}
                />
                <div
                  className="w-full max-w-[22px] rounded-t-sm bg-expense opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ height: `${expenseHeight}%` }}
                  title={`${t('dashboard.expenses')}: ${formatMoney(month.expenses)}`}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex gap-2 sm:gap-4">
          {months.map((month) => (
            <span
              key={month.month}
              className="flex-1 text-center text-xs capitalize text-muted-foreground"
            >
              {formatMonthLabel(month.month, locale)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
