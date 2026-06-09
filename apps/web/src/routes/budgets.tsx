import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDB } from '~/server/db'
import { getBudgetOverview, upsertBudget, deleteBudget } from '@tracker/db'
import { upsertBudgetSchema } from '@tracker/shared'
import type { BudgetOverviewItem } from '@tracker/shared'
import { Tags } from 'lucide-react'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { BudgetList } from '~/components/budgets/budget-list'
import { useFormat } from '~/lib/format'
import { useTranslation, type Locale } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'
import { withServerFn } from '~/server/logger'

const LOCALE_TAGS: Record<Locale, string> = { en: 'en-US', fr: 'fr-FR' }

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string, locale: Locale): string {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString(LOCALE_TAGS[locale], {
    month: 'long',
    year: 'numeric',
  })
}

// --- Server Functions ---

interface OverviewRow {
  category_id: number
  category_name: string
  category_color: string | null
  budget: number | null
  spent: number | null
}

const getBudgetData = createServerFn({ method: 'GET' }).handler(
  withServerFn('server-fn:getBudgetData', async () => {
    const db = getDB()
    const month = currentMonth()
    const result = (await getBudgetOverview(db, month)) as { results: OverviewRow[] }
    const items: BudgetOverviewItem[] = (result.results ?? []).map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      categoryColor: r.category_color,
      budget: r.budget ?? null,
      spent: Number(r.spent) || 0,
    }))
    return { month, items }
  }),
)

const setServerBudget = createServerFn({ method: 'POST' })
  .inputValidator(upsertBudgetSchema)
  .handler(withServerFn('server-fn:setServerBudget', async ({ data }) => {
    const db = getDB()
    return upsertBudget(db, data.categoryId, data.amount)
  }))

const clearServerBudget = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ categoryId: z.number() }))
  .handler(withServerFn('server-fn:clearServerBudget', async ({ data }) => {
    const db = getDB()
    await deleteBudget(db, data.categoryId)
    return { success: true }
  }))

// --- Route ---

export const Route = createFileRoute('/budgets')({
  loader: () => getBudgetData(),
  component: BudgetsPage,
  pendingComponent: BudgetsSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function BudgetsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-20" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  )
}

// --- Page ---

function BudgetsPage() {
  const { t, locale } = useTranslation()
  const { formatMoney } = useFormat()
  const { month, items } = Route.useLoaderData() as {
    month: string
    items: BudgetOverviewItem[]
  }
  const router = useRouter()

  const monthLabel = formatMonthLabel(month, locale)
  const budgeted = items.filter((i) => i.budget != null)
  const totalBudget = budgeted.reduce((sum, i) => sum + (i.budget ?? 0), 0)
  const totalSpent = budgeted.reduce((sum, i) => sum + i.spent, 0)
  const overallPct = totalBudget > 0 ? totalSpent / totalBudget : 0
  const overallOver = totalSpent > totalBudget

  async function handleSave(categoryId: number, amountCents: number | null) {
    try {
      if (amountCents != null) {
        await setServerBudget({ data: { categoryId, amount: amountCents } })
        toast.success(t('toast.updated'))
      } else {
        await clearServerBudget({ data: { categoryId } })
        toast.success(t('toast.deleted'))
      }
      router.invalidate()
    } catch (error) {
      console.error('Failed to save budget:', error)
      toast.error(translateApiError(error, t))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('budgets.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('budgets.subtitle')}</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Tags className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">{t('budgets.empty.title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('budgets.empty.subtitle')}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/categories">{t('budgets.empty.action')}</Link>
          </Button>
        </div>
      ) : (
        <>
          {totalBudget > 0 && (
            <Card className="space-y-3 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {t('budgets.summary', {
                    spent: formatMoney(totalSpent),
                    budget: formatMoney(totalBudget),
                  })}
                </p>
                <p className="text-xs capitalize text-muted-foreground">{monthLabel}</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                    overallOver ? 'bg-expense' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(overallPct, 1) * 100}%` }}
                />
              </div>
              {overallOver && (
                <p className="text-xs font-medium text-expense">
                  {t('budgets.over', { amount: formatMoney(totalSpent - totalBudget) })}
                </p>
              )}
            </Card>
          )}

          <BudgetList items={items} onSave={handleSave} />
        </>
      )}
    </div>
  )
}
