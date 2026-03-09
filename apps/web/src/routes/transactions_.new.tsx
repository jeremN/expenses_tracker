import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getCategories, createTransaction } from '@tracker/db'
import { createTransactionSchema } from '@tracker/shared'
import type { Category, CreateTransaction } from '@tracker/shared'
import { TransactionForm } from '~/components/transactions/transaction-form'

// --- Server Functions ---

const getServerCategories = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDB()
  return getCategories(db)
})

const createServerTransaction = createServerFn({ method: 'POST' })
  .inputValidator(createTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB()
    return createTransaction(db, data)
  })

// --- Route ---

export const Route = createFileRoute('/transactions/new')({
  loader: () => getServerCategories(),
  component: NewTransactionPage,
})

// --- Page Component ---

function NewTransactionPage() {
  const categories = Route.useLoaderData() as Category[]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: CreateTransaction) {
    setIsSubmitting(true)
    try {
      await createServerTransaction({ data })
      router.navigate({ to: '/transactions' })
    } catch (error) {
      console.error('Failed to create transaction:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Transaction</h1>
        <p className="text-sm text-muted-foreground">
          Record a new income or expense.
        </p>
      </div>

      <TransactionForm
        categories={categories}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
