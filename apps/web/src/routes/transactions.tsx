import { useState } from 'react'
import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getTransactions, getCategories, deleteTransaction } from '@tracker/db'
import { z } from 'zod'
import type { Transaction, Category } from '@tracker/shared'
import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { TransactionTable } from '~/components/transactions/transaction-table'
import { TransactionFilters, type TypeFilter } from '~/components/transactions/transaction-filters'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'

// --- Server Functions ---

const getServerTransactions = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      month: z.string().optional(),
      categoryId: z.number().optional(),
      type: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDB()
    const [rows, categories] = await Promise.all([
      getTransactions(db, data),
      getCategories(db),
    ])

    const transactions = rows.map((row) => ({
      ...row.transactions,
      category: row.categories,
    }))

    return { transactions, categories }
  })

const deleteServerTransaction = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const db = getDB()
    await deleteTransaction(db, data.id)
    return { success: true }
  })

// --- Route ---

export const Route = createFileRoute('/transactions')({
  loader: () => getServerTransactions({ data: {} }),
  component: TransactionsPage,
  pendingComponent: TransactionsSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function TransactionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

// --- Page Component ---

function TransactionsPage() {
  const { transactions: initialTransactions, categories } =
    Route.useLoaderData() as { transactions: Transaction[]; categories: Category[] }

  const [month, setMonth] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()

  // Client-side filtering from loaded data
  const filteredTransactions = initialTransactions.filter((tx) => {
    if (month && !tx.date.startsWith(month)) return false
    if (categoryId !== 'all' && tx.categoryId !== Number(categoryId)) return false
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false
    return true
  })

  function handleEdit(tx: Transaction) {
    // Navigate to an edit page (could also be a dialog; for now reuse the new page pattern)
    // For simplicity in this implementation, we'll just log — full edit can use the API route
    console.log('Edit transaction:', tx.id)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      await deleteServerTransaction({ data: { id: deleteTarget.id } })
      setDeleteTarget(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your income and expenses.
          </p>
        </div>
        <Button asChild>
          <Link to="/transactions/new">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <TransactionFilters
        month={month}
        onMonthChange={setMonth}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        categories={categories}
      />

      {/* Transaction Table */}
      <TransactionTable
        transactions={filteredTransactions}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction
              {deleteTarget?.description ? ` "${deleteTarget.description}"` : ''}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
