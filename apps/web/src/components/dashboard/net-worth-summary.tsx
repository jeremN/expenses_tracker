import { Link } from '@tanstack/react-router'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '~/components/ui/card'
import { Amount } from '~/components/ui/amount'
import { useTranslation } from '~/i18n'

interface NetWorthSummaryProps {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  /** Change vs the previous snapshot, or null when there's nothing to compare. */
  delta: number | null
}

export function NetWorthSummary({ netWorth, totalAssets, totalLiabilities, delta }: NetWorthSummaryProps) {
  const { t } = useTranslation()

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t('dashboard.netWorth.title')}</h2>
        <Link
          to="/net-worth"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {t('dashboard.netWorth.viewAll')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Amount cents={netWorth} tone="signed" animate className="text-3xl font-semibold" />
        {delta !== null && delta !== 0 && (
          <span className={`inline-flex items-center gap-1 text-sm ${delta > 0 ? 'text-income' : 'text-expense'}`}>
            {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <Amount cents={delta} tone="signed" />
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col">
          <span className="text-muted-foreground">{t('netWorth.assets')}</span>
          <Amount cents={totalAssets} tone="neutral" className="font-medium" />
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">{t('netWorth.liabilities')}</span>
          <Amount cents={totalLiabilities} tone="neutral" className="font-medium" />
        </div>
      </div>
    </Card>
  )
}
