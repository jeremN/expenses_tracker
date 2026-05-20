import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDB } from '~/server/db'
import {
  getInvestmentSnapshots,
  createInvestmentSnapshot,
  deleteInvestmentSnapshot,
} from '@tracker/db'
import { createInvestmentSnapshotSchema } from '@tracker/shared'
import type { InvestmentSnapshot } from '@tracker/shared'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { SnapshotForm } from '~/components/investments/snapshot-form'
import { GrowthChart } from '~/components/investments/growth-chart'
import { SnapshotHistory } from '~/components/investments/snapshot-history'
import { useFormat } from '~/lib/format'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { useTranslation } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'
import { withServerFn } from '~/server/logger'

// --- Server Functions ---

const getServerSnapshots = createServerFn({ method: 'GET' }).handler(
  withServerFn('server-fn:getServerSnapshots', async () => {
    const db = getDB()
    return getInvestmentSnapshots(db)
  }),
)

const createServerSnapshot = createServerFn({ method: 'POST' })
  .inputValidator(createInvestmentSnapshotSchema)
  .handler(withServerFn('server-fn:createServerSnapshot', async ({ data }) => {
    const db = getDB()
    return createInvestmentSnapshot(db, data)
  }))

const deleteServerSnapshot = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(withServerFn('server-fn:deleteServerSnapshot', async ({ data }) => {
    const db = getDB()
    return deleteInvestmentSnapshot(db, data.id)
  }))

// --- Route ---

export const Route = createFileRoute('/investments')({
  loader: () => getServerSnapshots(),
  component: InvestmentsPage,
  pendingComponent: InvestmentsSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function InvestmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
      <div>
        <Skeleton className="h-6 w-40 mb-3" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}

// --- Page Component ---

function InvestmentsPage() {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  const snapshots = Route.useLoaderData() as InvestmentSnapshot[]

  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InvestmentSnapshot | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()

  // Compute portfolio summary
  // snapshots are ordered date DESC from the server, so index 0 is the latest
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null

  // Sort ascending by date to find the earliest
  const sortedAsc = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const earliestSnapshot = sortedAsc.length > 0 ? sortedAsc[0] : null

  let gainLossPercent: number | null = null
  if (latestSnapshot && earliestSnapshot && earliestSnapshot.totalValue > 0 && snapshots.length >= 2) {
    gainLossPercent =
      ((latestSnapshot.totalValue - earliestSnapshot.totalValue) /
        earliestSnapshot.totalValue) *
      100
  }

  async function handleCreate(data: { date: string; totalValue: number; note?: string }) {
    setIsSubmitting(true)
    try {
      await createServerSnapshot({ data })
      toast.success(t('toast.created'))
      setFormOpen(false)
      router.invalidate()
    } catch (error) {
      console.error('Failed to create snapshot:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      await deleteServerSnapshot({ data: { id: deleteTarget.id } })
      toast.success(t('toast.deleted'))
      setDeleteTarget(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
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
          <h1 className="text-2xl font-bold">{t('investments.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('investments.subtitle')}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('investments.addSnapshot')}
        </Button>
      </div>

      {/* Portfolio Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('investments.summary.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {latestSnapshot ? (
            <div className="flex items-baseline gap-6">
              <div>
                <p className="text-sm text-muted-foreground">{t('investments.summary.currentValue')}</p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatMoney(latestSnapshot.totalValue)}
                </p>
              </div>
              {gainLossPercent !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('investments.summary.gainLoss')}</p>
                  <div className="flex items-center gap-1">
                    {gainLossPercent >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <p
                      className={`text-xl font-semibold tabular-nums ${
                        gainLossPercent >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {gainLossPercent >= 0 ? '+' : ''}
                      {gainLossPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {t('investments.summary.empty')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Growth Chart */}
      <GrowthChart snapshots={snapshots} />

      {/* Snapshot History */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('investments.history.title')}</h2>
        <SnapshotHistory snapshots={snapshots} onDelete={setDeleteTarget} />
      </div>

      {/* Create Snapshot Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        if (!open) setFormOpen(false)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('investments.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('investments.dialog.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <SnapshotForm
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => {
        if (!open) setDeleteTarget(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('investments.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('investments.delete.confirm', { date: deleteTarget?.date ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.deleting') : t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
