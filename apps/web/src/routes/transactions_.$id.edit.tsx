import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getCategories, getTransactionById, updateTransaction } from '@tracker/db'
import { updateTransactionSchema } from '@tracker/shared'
import type { Category, Transaction, UpdateTransaction } from '@tracker/shared'
import { z } from 'zod'
import { TransactionForm } from '~/components/transactions/transaction-form'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'

// --- Server Functions ---

const getServerCategories = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDB()
  return getCategories(db)
})

const getServerTransaction = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const db = getDB()
    const row = await getTransactionById(db, data.id)
    if (!row) throw new Error('Transaction not found')
    return { ...row.transactions, category: row.categories }
  })

const updateServerTransaction = createServerFn({ method: 'POST' })
  .inputValidator(updateTransactionSchema.extend({ id: z.number() }))
  .handler(async ({ data }) => {
    const { id, ...rest } = data
    const db = getDB()
    return updateTransaction(db, id, rest)
  })

// --- Route ---

export const Route = createFileRoute('/transactions/$id/edit')({
  loader: async ({ params }) => {
    const id = Number(params.id)
    const [transaction, categories] = await Promise.all([
      getServerTransaction({ data: { id } }),
      getServerCategories(),
    ])
    return { transaction, categories }
  },
  component: EditTransactionPage,
  pendingComponent: EditTransactionSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function EditTransactionSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  )
}

// --- Page Component ---

function EditTransactionPage() {
  const { transaction, categories } = Route.useLoaderData() as {
    transaction: Transaction
    categories: Category[]
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: UpdateTransaction & { amount: number; date: string }) {
    setIsSubmitting(true)
    try {
      await updateServerTransaction({ data: { ...data, id: transaction.id } })
      router.navigate({ to: '/transactions' })
    } catch (error) {
      console.error('Failed to update transaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Transaction</h1>
        <p className="text-sm text-muted-foreground">
          Update the details of this transaction.
        </p>
      </div>

      <TransactionForm
        categories={categories}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        defaultValues={transaction}
      />
    </div>
  )
}
