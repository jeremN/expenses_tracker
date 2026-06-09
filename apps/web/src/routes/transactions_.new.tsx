import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { createTransaction } from '@tracker/db'
import { createTransactionSchema } from '@tracker/shared'
import type { Category, CreateTransaction } from '@tracker/shared'
import { TransactionForm } from '~/components/transactions/transaction-form'
import { TransactionFormSkeleton } from '~/components/transactions/transaction-form-skeleton'
import { RouteError } from '~/components/route-error'
import { getServerCategories } from '~/server/shared-fns'
import { useTranslation } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'
import { withServerFn } from '~/server/logger'

const createServerTransaction = createServerFn({ method: 'POST' })
  .inputValidator(createTransactionSchema)
  .handler(withServerFn('server-fn:createServerTransaction', async ({ data }) => {
    const db = getDB()
    return createTransaction(db, data)
  }))

// --- Route ---

export const Route = createFileRoute('/transactions_/new')({
  loader: () => getServerCategories(),
  component: NewTransactionPage,
  pendingComponent: TransactionFormSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

// --- Page Component ---

function NewTransactionPage() {
  const { t } = useTranslation()
  const categories = Route.useLoaderData() as Category[]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: CreateTransaction) {
    setIsSubmitting(true)
    try {
      await createServerTransaction({ data })
      toast.success(t('toast.created'))
      router.navigate({ to: '/transactions' })
    } catch (error) {
      console.error('Failed to create transaction:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('transactions.new.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('transactions.new.subtitle')}
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
