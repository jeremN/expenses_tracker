import type { Account, AssetTransfer } from '@tracker/shared'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Card } from '~/components/ui/card'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'

interface TransferListProps {
  transfers: AssetTransfer[]
  accounts: Account[]
  onDelete: (id: number) => void
  isSubmitting?: boolean
}

export function TransferList({ transfers, accounts, onDelete, isSubmitting }: TransferListProps) {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()

  const accountName = (id: number | null) => {
    if (id == null) return t('transfers.external')
    return accounts.find((a) => a.id === id)?.name ?? t('transfers.external')
  }

  return (
    <Card className="divide-y divide-border">
      {transfers.map((tr) => (
        <div key={tr.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">{accountName(tr.fromAccountId)}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{accountName(tr.toAccountId)}</span>
            {tr.note && <span className="truncate text-muted-foreground">· {tr.note}</span>}
            {tr.transactionId != null && (
              <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('transfers.cashFlowTag')}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-muted-foreground">{tr.date}</span>
            <span className="font-medium tabular-nums">{formatMoney(tr.amount)}</span>
            <button
              type="button"
              onClick={() => onDelete(tr.id)}
              disabled={isSubmitting}
              aria-label={t('transfers.delete')}
              className="text-muted-foreground transition-colors hover:text-expense"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </Card>
  )
}
