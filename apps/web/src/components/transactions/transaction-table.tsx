import type { Transaction } from '@tracker/shared'
import { Pencil, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Amount } from '~/components/ui/amount'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'

interface TransactionTableProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">{t('transactions.empty.title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('transactions.empty.subtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('transactions.field.date')}</TableHead>
            <TableHead>{t('transactions.field.description')}</TableHead>
            <TableHead>{t('transactions.field.category')}</TableHead>
            <TableHead className="text-right">{t('transactions.field.amount')}</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="whitespace-nowrap">
                {formatDate(tx.date)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {tx.description || '-'}
                  {tx.recurringId && (
                    <span title={t('transactions.recurringBadge')} className="inline-flex">
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" aria-label={t('transactions.recurringBadge')} />
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {tx.category ? (
                  <Badge variant="secondary" className="gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: tx.category.color ?? '#6b7280' }}
                    />
                    {tx.category.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Amount
                  cents={tx.amount}
                  tone={tx.type === 'income' ? 'income' : 'expense'}
                  className="font-medium"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(tx)}
                    aria-label={t('transactions.editAction')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(tx)}
                    aria-label={t('transactions.deleteAction')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
