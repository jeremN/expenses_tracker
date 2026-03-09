import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getMonthlySummary, getTransactions, getCategories } from '@tracker/db'
import { generateMissingTransactions } from '~/server/recurring'
import type { MonthlySummary, Transaction, Category } from '@tracker/shared'
import { SummaryCards } from '~/components/dashboard/summary-cards'
import { MonthlyChart } from '~/components/dashboard/monthly-chart'
import { RecentTransactions } from '~/components/dashboard/recent-transactions'

// --- Server Functions ---

const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
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
  const transactions = transactionRows.map((row: { transactions: Record<string, unknown>; categories: Record<string, unknown> | null }) => ({
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
})

// --- Route ---

export const Route = createFileRoute('/')({
  loader: () => getDashboardData(),
  component: DashboardPage,
})

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your financial overview at a glance.
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        currentMonth={data.currentMonth}
        previousMonth={data.previousMonth}
      />

      {/* Chart + Recent Transactions grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyChart data={data.monthlyData} />
        <RecentTransactions transactions={data.recentTransactions} />
      </div>
    </div>
  )
}
