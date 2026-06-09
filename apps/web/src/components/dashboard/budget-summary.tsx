import { Link } from '@tanstack/react-router'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import type { BudgetOverviewItem } from '@tracker/shared'
import { Card } from '~/components/ui/card'
import { Amount } from '~/components/ui/amount'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'
import { summarizeBudgets } from './budget-summary.helpers'

export function BudgetSummary({ items }: { items: BudgetOverviewItem[] }) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  const { totalBudget, totalSpent, overallPct, overallOver, concerns } = summarizeBudgets(items)

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t('dashboard.budgets.title')}</h2>
        <Link
          to="/budgets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {t('dashboard.budgets.viewAll')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {t('budgets.summary', { spent: formatMoney(totalSpent), budget: formatMoney(totalBudget) })}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${overallOver ? 'bg-expense' : 'bg-primary'}`}
            style={{ width: `${Math.min(overallPct, 1) * 100}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2.5">
        {concerns.map((c) => (
          <li key={c.categoryId} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-2 truncate text-sm font-medium">
              {c.categoryColor && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.categoryColor }} />
              )}
              <span className="truncate">{c.categoryName}</span>
              {c.over && (
                <AlertTriangle
                  role="img"
                  aria-label={t('dashboard.budgets.over')}
                  className="h-3.5 w-3.5 shrink-0 text-expense"
                />
              )}
            </span>
            <span className="text-right text-sm tabular-nums text-muted-foreground">
              <Amount cents={c.spent} tone="neutral" /> / {formatMoney(c.budget)}
            </span>
            <div className="col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${c.over ? 'bg-expense' : 'bg-primary'}`}
                style={{ width: `${Math.min(c.ratio, 1) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
