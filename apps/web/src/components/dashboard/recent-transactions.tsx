import { Link } from '@tanstack/react-router'
import { ArrowRight, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Amount } from '~/components/ui/amount'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'
import type { Transaction } from '@tracker/shared'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('dashboard.recentTransactions')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-2">
        {transactions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Receipt className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">{t('dashboard.noTransactions')}</p>
          </div>
        ) : (
          <ul className="flex-1">
            {transactions.map((tx) => (
              <li key={tx.id}>
                <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {tx.description || t('dashboard.untitled')}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatDate(tx.date)}</span>
                      {tx.category && (
                        <>
                          <span aria-hidden className="text-border">·</span>
                          <span className="flex items-center gap-1">
                            <span
                              aria-hidden
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: tx.category.color ?? 'var(--muted-foreground)' }}
                            />
                            <span className="truncate">{tx.category.name}</span>
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  <Amount
                    cents={tx.amount}
                    tone={tx.type === 'income' ? 'income' : 'expense'}
                    className="shrink-0 text-sm font-medium"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {transactions.length > 0 && (
          <Link
            to="/transactions"
            className="mt-2 flex items-center justify-center gap-1 rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t('dashboard.viewAllTransactions')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
