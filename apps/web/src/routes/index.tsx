import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Plus, Upload } from 'lucide-react'
import { getDB } from '~/server/db'
import { getMonthlySummary, getTransactions, getCategories } from '@tracker/db'
import { generateMissingTransactions } from '~/server/recurring'
import type { MonthlySummary, Transaction, Category } from '@tracker/shared'
import { SummaryCards } from '~/components/dashboard/summary-cards'
import { MonthlyChart } from '~/components/dashboard/monthly-chart'
import { RecentTransactions } from '~/components/dashboard/recent-transactions'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { useTranslation } from '~/i18n'
import { withServerFn } from '~/server/logger'

// --- Server Functions ---

const getDashboardData = createServerFn({ method: 'GET' }).handler(withServerFn('server-fn:getDashboardData', async () => {
  const db = getDB()

  // Generate any missing recurring transactions first
  await generateMissingTransactions()

  const now = new Date()
  const currentYear = now.getFullYear().toString()
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Calculate previous month string
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  // Fetch data in parallel
  const [summaryResult, transactionRows, categories] = await Promise.all([
    getMonthlySummary(db, currentYear),
    getTransactions(db),
    getCategories(db),
  ])

  // Also fetch previous year's summary if previous month is in a different year
  let prevYearSummary: { results: unknown[] } = { results: [] }
  if (prevDate.getFullYear() < now.getFullYear()) {
    prevYearSummary = await getMonthlySummary(db, prevDate.getFullYear().toString()) as { results: unknown[] }
  }

  // Parse monthly summary results
  const allMonthlyData = [
    ...((prevYearSummary.results ?? []) as Array<{ month: string; income: number; expenses: number; balance: number }>),
    ...((summaryResult.results ?? []) as Array<{ month: string; income: number; expenses: number; balance: number }>),
  ]

  // Find current and previous month data
  const currentMonthData = allMonthlyData.find((m) => m.month === currentMonth)
  const previousMonthData = allMonthlyData.find((m) => m.month === previousMonth)

  // Map transaction rows to include category info
  const transactions = transactionRows.map((row) => ({
    ...row.transactions,
    category: row.categories,
  }))

  return {
    currentMonth: {
      income: currentMonthData?.income ?? 0,
      expenses: currentMonthData?.expenses ?? 0,
      balance: currentMonthData?.balance ?? 0,
    },
    previousMonth: {
      income: previousMonthData?.income ?? 0,
      expenses: previousMonthData?.expenses ?? 0,
      balance: previousMonthData?.balance ?? 0,
    },
    monthlyData: allMonthlyData as MonthlySummary[],
    recentTransactions: transactions.slice(0, 10),
    categories,
  }
}))

// --- Route ---

export const Route = createFileRoute('/')({
  loader: () => getDashboardData(),
  component: DashboardPage,
  pendingComponent: DashboardSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

// --- Page Component ---

interface DashboardData {
  currentMonth: { income: number; expenses: number; balance: number }
  previousMonth: { income: number; expenses: number; balance: number }
  monthlyData: MonthlySummary[]
  recentTransactions: Transaction[]
  categories: Category[]
}

function DashboardPage() {
  const data = Route.useLoaderData() as DashboardData
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {t('dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        currentMonth={data.currentMonth}
        previousMonth={data.previousMonth}
      />

      {data.recentTransactions.length === 0 ? (
        /* First-run: teach the next action instead of three empty panels. */
        <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-income-subtle text-income">
            <Plus className="h-6 w-6" />
          </span>
          <div className="max-w-md">
            <h2 className="text-lg font-semibold">{t('dashboard.onboarding.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground text-balance">
              {t('dashboard.onboarding.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link to="/transactions/new">
                <Plus className="h-4 w-4" />
                {t('transactions.add')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/import">
                <Upload className="h-4 w-4" />
                {t('import.title')}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        /* Chart + recent transactions, equal-height columns. */
        <div className="grid items-stretch gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <MonthlyChart data={data.monthlyData} />
          </div>
          <div className="lg:col-span-2">
            <RecentTransactions transactions={data.recentTransactions} />
          </div>
        </div>
      )}
    </div>
  )
}
