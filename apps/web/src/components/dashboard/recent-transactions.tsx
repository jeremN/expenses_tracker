import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { formatCents } from '~/lib/utils'
import type { Transaction } from '@tracker/shared'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {tx.description || 'Untitled'}
                </span>
                {tx.category && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px]"
                    style={
                      tx.category.color
                        ? {
                            backgroundColor: tx.category.color + '20',
                            color: tx.category.color,
                            borderColor: tx.category.color + '40',
                          }
                        : undefined
                    }
                  >
                    {tx.category.name}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(tx.date)}
              </span>
            </div>
            <span
              className={`shrink-0 text-sm font-semibold ${
                tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {tx.type === 'income' ? '+' : '-'}${formatCents(tx.amount)}
            </span>
          </div>
        ))}

        <Link
          to="/transactions"
          className="flex items-center justify-center gap-1 pt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all transactions
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  )
}
