import { useState } from 'react'
import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDB } from '~/server/db'
import {
  getAccounts,
  getHoldings,
  getTransfers,
  createAccount,
  updateAccount,
  deleteAccount,
  reconcileAccount,
  createHolding,
  deleteHolding,
  CASH_FLOW_ACCOUNT_TYPES,
} from '@tracker/db'
import {
  createAccountSchema,
  updateAccountSchema,
  createHoldingSchema,
  reconcileAccountSchema,
  assertFound,
} from '@tracker/shared'
import type { Account, Holding, AssetTransfer, CreateAccount, CreateHolding, CreateTransfer } from '@tracker/shared'
import { Plus, Pencil, Trash2, Scale, ArrowLeftRight } from 'lucide-react'
import { TransferForm } from '~/components/accounts/transfer-form'
import { TransferList } from '~/components/accounts/transfer-list'
import { createServerTransfer, deleteServerTransfer } from '~/server/transfer-fns'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Card } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog'
import { Amount } from '~/components/ui/amount'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { AccountForm } from '~/components/accounts/account-form'
import { HoldingForm } from '~/components/accounts/holding-form'
import { useFormat } from '~/lib/format'
import { parseToCents } from '~/lib/utils'
import { useTranslation } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'
import { withServerFn } from '~/server/logger'

// --- Server Functions ---

const getServerAccounts = createServerFn({ method: 'GET' }).handler(
  withServerFn('server-fn:getServerAccounts', async () => {
    const db = getDB()
    const accounts = await getAccounts(db)
    // Holdings only exist on `tracked` accounts.
    const tracked = accounts.filter((a) => a.valuation === 'tracked')
    const lists = await Promise.all(tracked.map((a) => getHoldings(db, a.id)))
    const holdings: Record<number, Holding[]> = {}
    tracked.forEach((a, i) => { holdings[a.id] = lists[i] })
    const transfers = await getTransfers(db, 25)
    return { accounts, holdings, transfers }
  }),
)

const createServerAccount = createServerFn({ method: 'POST' })
  .inputValidator(createAccountSchema)
  .handler(withServerFn('server-fn:createServerAccount', async ({ data }) => {
    return createAccount(getDB(), data)
  }))

const updateServerAccount = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number(), data: updateAccountSchema }))
  .handler(withServerFn('server-fn:updateServerAccount', async ({ data }) => {
    return assertFound(await updateAccount(getDB(), data.id, data.data), 'Account not found')
  }))

const deleteServerAccount = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(withServerFn('server-fn:deleteServerAccount', async ({ data }) => {
    assertFound(await deleteAccount(getDB(), data.id), 'Account not found')
    return { success: true }
  }))

const reconcileServerAccount = createServerFn({ method: 'POST' })
  .inputValidator(reconcileAccountSchema.extend({ id: z.number() }))
  .handler(withServerFn('server-fn:reconcileServerAccount', async ({ data }) => {
    const result = await reconcileAccount(getDB(), data.id, {
      value: data.value,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      note: data.note,
    })
    return assertFound(result, 'Account not found')
  }))

const createServerHolding = createServerFn({ method: 'POST' })
  .inputValidator(createHoldingSchema)
  .handler(withServerFn('server-fn:createServerHolding', async ({ data }) => {
    return createHolding(getDB(), data)
  }))

const deleteServerHolding = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(withServerFn('server-fn:deleteServerHolding', async ({ data }) => {
    assertFound(await deleteHolding(getDB(), data.id), 'Holding not found')
    return { success: true }
  }))

// --- Route ---

export const Route = createFileRoute('/accounts')({
  loader: () => getServerAccounts(),
  component: AccountsPage,
  pendingComponent: AccountsSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

interface AccountsData {
  accounts: Account[]
  holdings: Record<number, Holding[]>
  transfers: AssetTransfer[]
}

function AccountsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}

function AccountsPage() {
  const { t } = useTranslation()
  const { formatMoney } = useFormat()
  const data = Route.useLoaderData() as AccountsData
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [reconcileTarget, setReconcileTarget] = useState<Account | null>(null)
  const [reconcileValue, setReconcileValue] = useState('')
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
      console.error('Account action failed:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCreate(values: CreateAccount) {
    run(() => createServerAccount({ data: values }), 'toast.created', () => setFormOpen(false))
  }
  function handleUpdate(values: CreateAccount) {
    if (!editTarget) return
    run(() => updateServerAccount({ data: { id: editTarget.id, data: values } }), 'toast.updated', () => setEditTarget(null))
  }
  function handleDelete() {
    if (!deleteTarget) return
    run(() => deleteServerAccount({ data: { id: deleteTarget.id } }), 'toast.deleted', () => setDeleteTarget(null))
  }
  function handleReconcile() {
    if (!reconcileTarget) return
    const cents = parseToCents(reconcileValue)
    if (Number.isNaN(cents) || cents < 0) {
      toast.error(t('error.form.positiveNumber'))
      return
    }
    run(
      () => reconcileServerAccount({ data: { id: reconcileTarget.id, value: cents } }),
      'netWorth.reconciled',
      () => { setReconcileTarget(null); setReconcileValue('') },
    )
  }
  function handleAddHolding(values: CreateHolding) {
    run(() => createServerHolding({ data: values }), 'toast.created')
  }
  function handleDeleteHolding(id: number) {
    run(() => deleteServerHolding({ data: { id } }), 'toast.deleted')
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
          <h1 className="text-2xl font-semibold tracking-tight">{t('accounts.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('accounts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" />
            {t('transfers.record')}
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('accounts.add')}
          </Button>
        </div>
      </div>

      {data.accounts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">{t('accounts.empty.title')}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t('accounts.empty.subtitle')}</p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('accounts.add')}
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {data.accounts.map((account) => (
            <li key={account.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {account.color && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                      )}
                      <span className="truncate font-medium">{account.name}</span>
                      {!account.isActive && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                          {t('accounts.inactive')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(`accounts.kind.${account.kind}`)} · {t(`accounts.type.${account.type}`)}
                      {account.institution ? ` · ${account.institution}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Amount cents={account.currentValue} tone="neutral" className="font-semibold" />
                    <div className="flex items-center gap-1">
                      <IconButton label={t('accounts.reconcileAction')} onClick={() => { setReconcileTarget(account); setReconcileValue((account.currentValue / 100).toString()) }}>
                        <Scale className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={t('accounts.editAction')} onClick={() => setEditTarget(account)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={t('accounts.deleteAction')} onClick={() => setDeleteTarget(account)} danger>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                </div>

                {account.valuation === 'tracked' && (
                  <div className="mt-4 space-y-2 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">{t('accounts.holdings.title')}</p>
                    <ul className="space-y-1">
                      {(data.holdings[account.id] ?? []).map((h) => (
                        <li key={h.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">
                            {h.name}
                            {h.quantity != null ? <span className="text-muted-foreground"> · {h.quantity}</span> : null}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">{formatMoney(h.marketValue)}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteHolding(h.id)}
                              disabled={isSubmitting}
                              aria-label={t('accounts.holdings.delete')}
                              className="text-muted-foreground transition-colors hover:text-expense"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <HoldingForm accountId={account.id} onSubmit={handleAddHolding} isSubmitting={isSubmitting} />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {data.transfers.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">{t('transfers.title')}</h2>
            <Link to="/transfers" className="text-xs font-medium text-primary hover:underline">
              {t('transfers.viewAll')}
            </Link>
          </div>
          <TransferList
            transfers={data.transfers}
            accounts={data.accounts}
            onDelete={handleDeleteTransfer}
            isSubmitting={isSubmitting}
          />
        </section>
      )}

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={(open) => { if (!open) setTransferOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transfers.new.title')}</DialogTitle>
            <DialogDescription>{t('transfers.new.subtitle')}</DialogDescription>
          </DialogHeader>
          <TransferForm accounts={data.accounts} onSubmit={handleCreateTransfer} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts.new.title')}</DialogTitle>
            <DialogDescription>{t('accounts.new.subtitle')}</DialogDescription>
          </DialogHeader>
          <AccountForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts.edit.title')}</DialogTitle>
            <DialogDescription>{t('accounts.edit.subtitle')}</DialogDescription>
          </DialogHeader>
          {editTarget && <AccountForm defaultValues={editTarget} onSubmit={handleUpdate} isSubmitting={isSubmitting} />}
        </DialogContent>
      </Dialog>

      {/* Reconcile dialog */}
      <Dialog open={!!reconcileTarget} onOpenChange={(open) => { if (!open) { setReconcileTarget(null); setReconcileValue('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts.reconcile.title')}</DialogTitle>
            <DialogDescription>{t('accounts.reconcile.subtitle', { name: reconcileTarget?.name ?? '' })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={reconcileValue}
              onChange={(e) => setReconcileValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {reconcileTarget && CASH_FLOW_ACCOUNT_TYPES.has(reconcileTarget.type)
                ? t('accounts.reconcile.hint')
                : t('accounts.reconcile.hintNoCashFlow')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setReconcileTarget(null); setReconcileValue('') }} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleReconcile} disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('accounts.reconcile.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts.delete.title')}</DialogTitle>
            <DialogDescription>{t('accounts.delete.confirm', { name: deleteTarget?.name ?? '' })}</DialogDescription>
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

function IconButton({
  label, onClick, danger, children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent ${danger ? 'hover:text-expense' : 'hover:text-foreground'}`}
    >
      {children}
    </button>
  )
}
