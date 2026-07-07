import { useState } from 'react'
import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDB } from '~/server/db'
import {
  getNetWorthTotals,
  getAccounts,
  getNetWorthSnapshots,
  upsertNetWorthSnapshot,
  deleteNetWorthSnapshot,
} from '@tracker/db'
import { createNetWorthSnapshotSchema, assertFound } from '@tracker/shared'
import type { Account, NetWorthSnapshot } from '@tracker/shared'
import { CameraIcon, Trash2, Settings2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Amount } from '~/components/ui/amount'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { NetWorthChart } from '~/components/net-worth/net-worth-chart'
import { groupAccountsByKind, latestNetWorthDelta } from '~/lib/net-worth.helpers'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'
import { withServerFn } from '~/server/logger'

// --- Server Functions ---

const getServerNetWorth = createServerFn({ method: 'GET' }).handler(
  withServerFn('server-fn:getServerNetWorth', async () => {
    const db = getDB()
    const [totals, accounts, snapshots] = await Promise.all([
      getNetWorthTotals(db),
      getAccounts(db),
      getNetWorthSnapshots(db),
    ])
    return {
      totalAssets: totals.totalAssets,
      totalLiabilities: totals.totalLiabilities,
      netWorth: totals.totalAssets - totals.totalLiabilities,
      accounts,
      snapshots,
    }
  }),
)

const createServerSnapshot = createServerFn({ method: 'POST' })
  .inputValidator(createNetWorthSnapshotSchema)
  .handler(withServerFn('server-fn:createServerNetWorthSnapshot', async ({ data }) => {
    const db = getDB()
    // Totals computed server-side — a snapshot always reflects real state.
    const totals = await getNetWorthTotals(db)
    return upsertNetWorthSnapshot(db, {
      date: data.date ?? new Date().toISOString().slice(0, 10),
      totalAssets: totals.totalAssets,
      totalLiabilities: totals.totalLiabilities,
      netWorth: totals.totalAssets - totals.totalLiabilities,
      note: data.note,
    })
  }))

const deleteServerSnapshot = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(withServerFn('server-fn:deleteServerNetWorthSnapshot', async ({ data }) => {
    const db = getDB()
    assertFound(await deleteNetWorthSnapshot(db, data.id), 'Net worth snapshot not found')
    return { success: true }
  }))

// --- Route ---

export const Route = createFileRoute('/net-worth')({
  loader: () => getServerNetWorth(),
  component: NetWorthPage,
  pendingComponent: NetWorthSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

interface NetWorthData {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  accounts: Account[]
  snapshots: NetWorthSnapshot[]
}

function NetWorthSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </div>
  )
}

function NetWorthPage() {
  const { t } = useTranslation()
  const { formatMoney, formatDate } = useFormat()
  const data = Route.useLoaderData() as NetWorthData
  const router = useRouter()
  const [isBusy, setIsBusy] = useState(false)

  const { assets, liabilities } = groupAccountsByKind(data.accounts)
  const delta = latestNetWorthDelta(data.snapshots)

  async function handleSnapshot() {
    setIsBusy(true)
    try {
      await createServerSnapshot({ data: {} })
      toast.success(t('netWorth.snapshotTaken'))
      router.invalidate()
    } catch (error) {
      console.error('Failed to take net worth snapshot:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDeleteSnapshot(id: number) {
    setIsBusy(true)
    try {
      await deleteServerSnapshot({ data: { id } })
      toast.success(t('toast.deleted'))
      router.invalidate()
    } catch (error) {
      console.error('Failed to delete net worth snapshot:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsBusy(false)
    }
  }

  const hasAccounts = data.accounts.some((a) => a.isActive)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('netWorth.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('netWorth.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/accounts">
              <Settings2 className="h-4 w-4" />
              {t('netWorth.manageAccounts')}
            </Link>
          </Button>
          <Button onClick={handleSnapshot} disabled={isBusy || !hasAccounts}>
            <CameraIcon className="h-4 w-4" />
            {t('netWorth.snapshotNow')}
          </Button>
        </div>
      </div>

      {/* Hero summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('netWorth.current')}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAccounts ? (
            <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
              <Amount cents={data.netWorth} tone="signed" animate className="text-4xl font-semibold" />
              <div>
                <p className="text-sm text-muted-foreground">{t('netWorth.assets')}</p>
                <Amount cents={data.totalAssets} tone="neutral" className="text-xl font-semibold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('netWorth.liabilities')}</p>
                <Amount cents={data.totalLiabilities} tone="neutral" className="text-xl font-semibold" />
              </div>
              {delta !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('netWorth.sinceLast')}</p>
                  <Amount cents={delta} tone="signed" className="text-xl font-semibold" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-muted-foreground">{t('netWorth.empty')}</p>
              <Button asChild>
                <Link to="/accounts">{t('netWorth.addAccount')}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend */}
      <NetWorthChart snapshots={data.snapshots} />

      {/* Breakdown */}
      {hasAccounts && (
        <div className="grid gap-6 md:grid-cols-2">
          <AccountColumn title={t('netWorth.assets')} accounts={assets} formatMoney={formatMoney} typeLabel={(ty) => t(`accounts.type.${ty}`)} />
          <AccountColumn title={t('netWorth.liabilities')} accounts={liabilities} formatMoney={formatMoney} typeLabel={(ty) => t(`accounts.type.${ty}`)} />
        </div>
      )}

      {/* Snapshot history */}
      {data.snapshots.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t('netWorth.history')}</h2>
          <Card className="divide-y">
            {data.snapshots.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">{formatDate(s.date)}</span>
                <div className="flex items-center gap-3">
                  <Amount cents={s.netWorth} tone="signed" className="text-sm font-medium" />
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(s.id)}
                    disabled={isBusy}
                    aria-label={t('netWorth.deleteSnapshot', { date: s.date })}
                    className="text-muted-foreground transition-colors hover:text-expense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

function AccountColumn({
  title, accounts, formatMoney, typeLabel,
}: {
  title: string
  accounts: Account[]
  formatMoney: (cents: number) => string
  typeLabel: (type: Account['type']) => string
}) {
  if (accounts.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>
      <Card className="divide-y">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-2 truncate text-sm">
              {a.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />}
              <span className="truncate font-medium">{a.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{typeLabel(a.type)}</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums">{formatMoney(a.currentValue)}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
