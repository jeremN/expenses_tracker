import type { AccountValuationEntry } from '@tracker/shared'
import { withValuationDeltas } from '~/lib/net-worth.helpers'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'

interface ValuationHistoryProps {
  valuations: AccountValuationEntry[]
}

export function ValuationHistory({ valuations }: ValuationHistoryProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()

  if (valuations.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t('accounts.history.empty')}</p>
  }

  const rows = withValuationDeltas(valuations)

  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="text-muted-foreground">{r.date}</span>
          <div className="flex items-center gap-3">
            {r.change != null && (
              // Neutral on purpose: a step change is not inherently good/bad
              // (owing more on a liability shouldn't read as a green gain).
              <span className="text-xs tabular-nums text-muted-foreground">
                {r.change >= 0 ? '+' : '−'}{formatMoney(Math.abs(r.change))}
              </span>
            )}
            <span className="font-medium tabular-nums">{formatMoney(r.value)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
