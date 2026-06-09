import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getTransactions, countTransactions, getCategories, deleteTransaction } from '@tracker/db'
import { z } from 'zod'
import type { Transaction, Category } from '@tracker/shared'
import { assertFound } from '@tracker/shared'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { useTranslation } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'
import { withServerFn } from '~/server/logger'

const PAGE_SIZE = 25

const txSearchSchema = z.object({
  // `.catch` so a hand-edited bad value (?page=abc) degrades to the default
  // instead of throwing the whole route to its errorComponent.
  page: z.coerce.number().int().positive().optional().catch(undefined),
  q: z.string().optional(),
  month: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
})
type TxSearch = z.infer<typeof txSearchSchema>

// --- Server Functions ---

const getServerTransactions = createServerFn({ method: 'GET' })
  .inputValidator(txSearchSchema)
  .handler(withServerFn('server-fn:getServerTransactions', async ({ data }) => {
    const db = getDB()
    const filters = {
      month: data.month || undefined,
      categoryId: data.category && data.category !== 'all' ? Number(data.category) : undefined,
      type: data.type,
      search: data.q?.trim() || undefined,
    }
    // Count + categories first so we can clamp the page before fetching it.
    const [total, categories] = await Promise.all([
      countTransactions(db, filters).then((r) => r?.value ?? 0),
      getCategories(db),
    ])
    // Clamp to the available range: a stale URL (e.g. after deleting the last
    // rows on a page) must not overshoot into an empty offset.
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const page = Math.min(Math.max(data.page ?? 1, 1), pageCount)
    const rows = await getTransactions(db, {
      ...filters,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
    const transactions = rows.map((row) => ({ ...row.transactions, category: row.categories }))
    return { transactions, total, page, categories }
  }))

const deleteServerTransaction = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(withServerFn('server-fn:deleteServerTransaction', async ({ data }) => {
    const db = getDB()
    assertFound(await deleteTransaction(db, data.id), 'Transaction not found')
    return { success: true }
  }))

// --- Route ---

export const Route = createFileRoute('/transactions')({
  validateSearch: (search): TxSearch => txSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getServerTransactions({ data: deps }),
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
  const { t } = useTranslation()
  const { transactions, total, page, categories } = Route.useLoaderData() as {
    transactions: Transaction[]; total: number; page: number; categories: Category[]
  }
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Local search box mirrors the URL `q`, debounced into navigation.
  const [searchInput, setSearchInput] = useState(search.q ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => setSearchInput(search.q ?? ''), [search.q])
  useEffect(() => () => clearTimeout(debounce.current), [])

  function setSearchParams(next: Partial<TxSearch>, resetPage = true) {
    navigate({
      search: (prev) => {
        const merged = { ...prev, ...next, ...(resetPage ? { page: undefined } : {}) }
        return Object.fromEntries(
          Object.entries(merged).filter(([, v]) => v !== '' && v != null && v !== 'all'),
        ) as TxSearch
      },
    })
  }

  function handleSearchChange(value: string) {
    setSearchInput(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setSearchParams({ q: value || undefined }), 300)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const showingTo = start + transactions.length

  function handleEdit(tx: Transaction) {
    navigate({ to: '/transactions/$id/edit', params: { id: String(tx.id) } })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      await deleteServerTransaction({ data: { id: deleteTarget.id } })
      toast.success(t('toast.deleted'))
      setDeleteTarget(null)
      // Force the loader to re-run regardless of staleTime config.
      router.invalidate()
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('transactions.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('transactions.subtitle')}</p>
        </div>
        <Button asChild>
          <Link to="/transactions/new">
            <Plus className="h-4 w-4" />
            {t('transactions.add')}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <TransactionFilters
        search={searchInput}
        onSearchChange={handleSearchChange}
        month={search.month ?? ''}
        onMonthChange={(m) => setSearchParams({ month: m || undefined })}
        categoryId={search.category ?? 'all'}
        onCategoryChange={(c) => setSearchParams({ category: c === 'all' ? undefined : c })}
        typeFilter={(search.type ?? 'all') as TypeFilter}
        onTypeChange={(ty) => setSearchParams({ type: ty === 'all' ? undefined : ty })}
        categories={categories}
      />

      {/* Transaction Table */}
      <TransactionTable transactions={transactions} onEdit={handleEdit} onDelete={setDeleteTarget} />

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {t('transactions.pagination.showing', { from: start + 1, to: showingTo, total })}
          </span>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParams({ page: Math.max(1, page - 1) }, false)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('transactions.pagination.previous')}
              </Button>
              <span className="tabular-nums">
                {t('transactions.pagination.page', { page, pages: pageCount })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParams({ page: Math.min(pageCount, page + 1) }, false)}
                disabled={page >= pageCount}
              >
                {t('transactions.pagination.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transactions.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('transactions.delete.confirm', {
                name: deleteTarget?.description ? ` "${deleteTarget.description}"` : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? t('common.deleting') : t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
