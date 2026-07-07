import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getAccounts, getTransfers } from '@tracker/db'
import type { Account, AssetTransfer, CreateTransfer } from '@tracker/shared'
import { ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { TransferForm } from '~/components/accounts/transfer-form'
import { TransferList } from '~/components/accounts/transfer-list'
import { createServerTransfer, deleteServerTransfer } from '~/server/transfer-fns'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { withServerFn } from '~/server/logger'
import { useTranslation } from '~/i18n'
import { translateApiError } from '~/i18n/errors'

const getServerTransfers = createServerFn({ method: 'GET' }).handler(
  withServerFn('server-fn:getServerTransfers', async () => {
    const db = getDB()
    const [accounts, transfers] = await Promise.all([getAccounts(db), getTransfers(db)])
    return { accounts, transfers }
  }),
)

interface TransfersData {
  accounts: Account[]
  transfers: AssetTransfer[]
}

function TransfersSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-40" />
    </div>
  )
}

function TransfersPage() {
  const { t } = useTranslation()
  const data = Route.useLoaderData() as TransfersData
  const router = useRouter()

  const [transferOpen, setTransferOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function run(fn: () => Promise<unknown>, successKey: string, onDone?: () => void) {
    setIsSubmitting(true)
    try {
      await fn()
      toast.success(t(successKey))
      onDone?.()
      router.invalidate()
    } catch (error) {
      console.error('Transfer action failed:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCreateTransfer(values: CreateTransfer) {
    run(() => createServerTransfer({ data: values }), 'transfers.recorded', () => setTransferOpen(false))
  }
  function handleDeleteTransfer(id: number) {
    run(() => deleteServerTransfer({ data: { id } }), 'toast.deleted')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('transfers.page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('transfers.page.subtitle')}</p>
        </div>
        <Button onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight className="h-4 w-4" />
          {t('transfers.new.title')}
        </Button>
      </div>

      {data.transfers.length === 0 ? (
        <Card className="flex flex-col items-center gap-1 px-6 py-12 text-center">
          <p className="text-sm font-medium">{t('transfers.page.empty')}</p>
          <p className="text-xs text-muted-foreground">{t('transfers.page.emptyHint')}</p>
        </Card>
      ) : (
        <TransferList
          transfers={data.transfers}
          accounts={data.accounts}
          onDelete={handleDeleteTransfer}
          isSubmitting={isSubmitting}
        />
      )}

      <Dialog open={transferOpen} onOpenChange={(open) => { if (!open) setTransferOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transfers.new.title')}</DialogTitle>
            <DialogDescription>{t('transfers.new.subtitle')}</DialogDescription>
          </DialogHeader>
          <TransferForm accounts={data.accounts} onSubmit={handleCreateTransfer} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/transfers')({
  loader: () => getServerTransfers(),
  component: TransfersPage,
  pendingComponent: TransfersSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})
